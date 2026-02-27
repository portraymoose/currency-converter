import { Request, Response } from 'express';
import axios from 'axios';

let currenciesCache: { data: string[]; timestamp: number } | null = null;

/**
 * @openapi
 * /api/currencies:
 *   get:
 *     summary: Возвращает список поддерживаемых валют
 *     tags: [Currencies]
 *     responses:
 *       200:
 *         description: Список кодов валют (ISO 4217)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 example: "USD"
 *       502:
 *         description: Ошибка авторизации внешнего API или ошибка от внешнего API
 *       503:
 *         description: Внешний API временно недоступен или превышен лимит запросов
 *       500:
 *         description: Внутренняя ошибка сервера
 */

export async function getCurrencies(req: Request, res: Response) {
  try {
    if (currenciesCache && Date.now() - currenciesCache.timestamp < 60 * 60 * 1000) {
      return res.json(currenciesCache.data);
    }
    const response = await axios.get(
      `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_API_KEY}`,
    );
    const currencies = Object.keys(response.data.rates);
    currenciesCache = {
      data: currencies,
      timestamp: Date.now(),
    };
    res.json(currencies);
  } catch (error: unknown) {
    console.error('Ошибка при получении списка валют:', error);
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
    res.status(500).json({ message: 'Ошибка при получении списка валют.' });
  }
}
