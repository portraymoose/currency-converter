# Currency Converter API

Бэкенд-приложение для конвертации валют. Выступает прослойкой между клиентским приложением и сторонним API Open Exchange Rates, предоставляющим информацию о курсах валют.

## Технологии

- Node.js (LTS)
- TypeScript
- Express
- Supabase (PostgreSQL)
- Axios
- Swagger для документации
- ESLint / Prettier

## Установка и запуск

1. Клонировать репозиторий:

   ```bash
   git clone <url>
   cd currency-converter

   ```

2. Установить зависимости:

   ```bash
   npm install
   ```

3. Создать файл .env на основе .env.example и заполнить своими данными:
   OPEN_EXCHANGE_API_KEY — ключ от Open Exchange Rates
   SUPABASE_URL и SUPABASE_ANON_KEY — данные из проекта Supabase

4. Запустить в режиме разработки:

   ```bash
   npm run dev
   ```

Или скомпилировать и запустить:

```bash
npm run build
npm start
```

Сервер будет доступен по адресу http://localhost:3000

## Документация API

После запуска сервера документация Swagger доступна по адресу:
http://localhost:3000/api-docs

## Эндпоинты

- **GET /api/currencies** — список поддерживаемых валют (кэш: 1 час, in-memory)
- **GET /api/rates?base=USD&targets=EUR,GBP** — курсы валют (кэш: 24 часа в БД + 5 минут in-memory)
- **GET /api/user** — настройки текущего пользователя (по cookie `user_id`)
- **POST /api/user** — создание или обновление настроек пользователя

## Структура проекта

```
src/
├── controllers/      # обработчики запросов
├── routes/           # маршруты
├── middleware/       # middleware (cookie, auth)
├── services/         # бизнес-логика (rates, user)
├── utils/            # supabase клиент, кэш
├── config/           # конфигурация (Swagger)
└── server.ts         # точка входа
```

## Переменные окружения

См. файл .env.example.

## Линтинг и форматирование

Проверка кода:

```bash
npm run lint
```

Автоформатирование:

```run format

```

## Демонстрация работы

Скриншоты работы всех эндпоинтов находятся в папке demo.
