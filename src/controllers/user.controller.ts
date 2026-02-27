import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

/**
 * @openapi
 * /api/user:
 *   get:
 *     summary: Возвращает настройки текущего пользователя
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Настройки пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: string
 *                 base_currency:
 *                   type: string
 *                 favorites:
 *                   type: array
 *                   items:
 *                     type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Ошибка сервера
 */

export async function getUser(req: Request, res: Response) {
  const userId = req.cookies.user_id;
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    return res.status(500).json({ message: error.message });
  }
  if (!data) {
    const { data: newUser, error: insertError } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        base_currency: 'USD',
        favorites: [],
      })
      .select()
      .single();
    if (insertError) {
      return res.status(500).json({ message: insertError.message });
    }
    return res.json(newUser);
  }
  res.json(data);
}

/**
 * @openapi
 * /api/user:
 *   post:
 *     summary: Обновляет настройки пользователя (или создаёт, если пользователя нет)
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base_currency:
 *                 type: string
 *                 example: EUR
 *               favorites:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["USD", "GBP"]
 *     responses:
 *       200:
 *         description: Обновлённые настройки пользователя
 *       400:
 *         description: Не указаны поля для обновления
 *       500:
 *         description: Ошибка сервера
 */

export async function updateUser(req: Request, res: Response) {
  try {
    const userId = req.cookies.user_id;
    const { base_currency, favorites } = req.body;
    if (!base_currency && !favorites) {
      return res.status(400).json({ message: 'Укажите base_currency или favorites.' });
    }
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (fetchError) {
      return res.status(500).json({ message: fetchError.message });
    }
    let result;
    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          base_currency: base_currency || 'USD',
          favorites: favorites || [],
        })
        .select()
        .single();
      if (insertError) {
        return res.status(500).json({ message: insertError.message });
      }
      result = newUser;
    } else {
      const updates: any = { updated_at: new Date().toISOString() };
      if (base_currency) updates.base_currency = base_currency;
      if (favorites) updates.favorites = favorites;
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      if (updateError) {
        return res.status(500).json({ message: updateError.message });
      }
      result = updatedUser;
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
