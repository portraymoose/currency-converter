import { Request, Response } from 'express';
import axios from 'axios';
import { supabase } from '../utils/supabase';
import { requestCache } from '../utils/cache';

/**
 * @openapi
 * /api/rates:
 *   get:
 *     summary: Получить курсы валют
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: base
 *         schema:
 *           type: string
 *           example: USD
 *         description: Базовая валюта (если не указана, берётся из настроек пользователя)
 *       - in: query
 *         name: targets
 *         required: true
 *         schema:
 *           type: string
 *           example: EUR,GBP,JPY
 *         description: Список целевых валют через запятую
 *     responses:
 *       200:
 *         description: Курсы валют
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 base:
 *                   type: string
 *                 rates:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *       400:
 *         description: Неверный запрос (отсутствуют targets, неверный код валюты)
 *       502:
 *         description: Ошибка авторизации внешнего API или ошибка от внешнего API
 *       503:
 *         description: Внешний API временно недоступен или превышен лимит запросов
 *       500:
 *         description: Внутренняя ошибка сервера
 */

export async function getRates(req: Request, res: Response) {
  try {
    const userId = req.cookies.user_id;
    let base = req.query.base as string | undefined;
    const targetsParam = req.query.targets as string;
    if (!targetsParam) {
      return res.status(400).json({ message: 'targets обязателен.' });
    }
    const targets = targetsParam.split(',');
    if (!base) {
      const { data, error } = await supabase
        .from('user_settings')
        .select('base_currency')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.error('Ошибка при получении настроек пользователя:', error);
        return res.status(500).json({ message: 'Ошибка базы данных' });
      }
      if (!data) {
        const { error: insertError } = await supabase.from('user_settings').insert({
          user_id: userId,
          base_currency: 'USD',
          favorites: [],
        });
        if (insertError) {
          console.error('Ошибка при создании пользователя:', insertError);
          return res.status(500).json({ message: 'Ошибка базы данных' });
        }
        base = 'USD';
      } else {
        base = data.base_currency;
      }
    }
    if (!base) {
      return res.status(500).json({ message: 'Base валюта не определена.' });
    }
    const cacheKey = `${userId}_${base}_${targetsParam}`;
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return res.json(cached.data);
    }
    const result: Record<string, number> = {};
    const nowMinus24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const missingTargets: string[] = [];
    for (const target of targets) {
      const { data: cachedRate, error: cacheError } = await supabase
        .from('rates_cache')
        .select('*')
        .eq('base_currency', base)
        .eq('target_currency', target)
        .gt('created_at', nowMinus24h)
        .maybeSingle();
      if (cacheError) {
        console.error('Ошибка при чтении кэша:', cacheError);
        return res.status(500).json({ message: 'Ошибка базы данных' });
      }
      if (cachedRate) {
        result[target] = Number(cachedRate.rate);
      } else {
        missingTargets.push(target);
      }
    }
    if (missingTargets.length > 0) {
      console.log('24h cache miss → вызов внешнего API');
      const response = await axios.get(
        `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_API_KEY}`,
      );
      const rates = response.data.rates;
      if (!rates[base]) {
        return res.status(400).json({ message: 'Неверная base валюта.' });
      }
      for (const target of missingTargets) {
        if (!rates[target]) {
          return res.status(400).json({ message: 'Неверный код валюты.' });
        }
        result[target] = rates[target] / rates[base];
        const { error: upsertError } = await supabase.from('rates_cache').upsert(
          {
            base_currency: base,
            target_currency: target,
            rate: result[target],
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'base_currency, target_currency',
            ignoreDuplicates: false,
          },
        );
        if (upsertError) {
          console.error('Ошибка upsert в rates_cache:', upsertError);
        }
      }
    }
    const responsePayload = {
      base,
      rates: result,
    };
    requestCache.set(cacheKey, {
      data: responsePayload,
      timestamp: Date.now(),
    });
    res.json(responsePayload);
  } catch (error: unknown) {
    console.error('Ошибка при получении курсов валют:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return res.status(502).json({ message: 'Ошибка авторизации внешнего API (неверный ключ)' });
      }
      if (error.response?.status === 429) {
        return res.status(503).json({ message: 'Превышен лимит запросов к внешнему API' });
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(503).json({ message: 'Внешний API недоступен' });
      }
      if (error.response) {
        return res
          .status(502)
          .json({ message: `Внешний API вернул ошибку: ${error.response.status}` });
      }
    }
    res.status(500).json({ message: 'Ошибка при получении курсов валют.' });
  }
}
