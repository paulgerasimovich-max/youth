# Материалы для App Store и Google Play

Всё, что нужно вписать в магазины в день отправки приложения. Тексты для магазинов — на английском (в блоках),
пояснения — на русском. Тексты описывают только то, что в приложении действительно есть; если функция меняется —
правим и здесь.

Длины проверяет скрипт: `node scripts/check-store-listing.mjs`.

## 1. Названия

| Поле | Лимит | Текст |
|---|---|---|
| Название в App Store | 30 | `Woodmark Youth` |
| Подзаголовок (App Store) | 30 | `Daily word, chat and events` |
| Название в Google Play | 30 | `Woodmark Youth` |
| Имя под иконкой на телефоне | ~12 | `Youth Group` (в `app.json`) |

**Решение владельца (2026-11-19):** в магазинах — «Woodmark Youth», под иконкой на телефоне — «Youth Group».
«Youth Group» для магазина не годится: название в App Store должно быть единственным на весь магазин.
«Woodmark Youth» под иконкой обрезалось бы до «Woodmark Yo…» — там помещается около 12 знаков.
Внутри приложения и на сайте стоит «Woodmark Youth», как в магазине.

## 2. App Store

### Рекламный текст (Promotional Text, до 170 знаков; можно менять без новой версии)

```promo
A word for every day, the group chat, what's coming up, and a safe way to ask a leader anything. One place, just for our group.
```

### Описание (Description, до 4000 знаков)

```description
Woodmark Youth is the app for the youth group at Woodmark Church in Kirkland, WA. It keeps everything we do in one place, so nothing gets lost in a messy group chat.

A WORD FOR EVERY DAY
Every week our leaders break Sunday's message into short thoughts, one for each day. React, comment and talk about it together.

ASK A LEADER, ANONYMOUSLY
Got a question you don't want your name on? Ask it. Leaders can answer, but nobody can see who asked. Not even us. These conversations delete themselves 7 days after the last message.

GROUP CHAT
Messages, photos and videos, replies and reactions. Just our group.

EVENTS AND IDEAS
See what's coming up, tap "I'm in" and get a reminder before it starts. Got an idea for the next hangout? Pitch it and let people vote.

PHOTOS AND VIDEOS
Albums from retreats, hangouts and everything in between.

BIRTHDAYS
We remember your day. Day and month only, and only if you want.

BUILT TO BE SAFE
• No phone number and no password. You sign in with a code sent to your email.
• We keep only your name and email. No ads and no tracking.
• Report any message or block a person in two taps. Leaders look at every report within 24 hours.
• Delete your account any time, right in the app.

Woodmark Youth is for people who are 13 or older.
```

### Ключевые слова (Keywords, до 100 знаков, через запятую без пробелов)

Слова из названия повторять не нужно — магазин ищет по ним и так.

```keywords
church,youth group,devotional,bible,teens,students,ministry,faith,christian,events,chat,kirkland
```

### Что нового (What's New) для первой версии

```whatsnew
First release.
```

### Остальные поля

| Поле | Значение |
|---|---|
| Основная категория | Lifestyle |
| Дополнительная категория | Social Networking |
| Адрес поддержки (Support URL) | `https://woodmarkyouth.com/#help` |
| Маркетинговый адрес (Marketing URL) | `https://woodmarkyouth.com` |
| Политика конфиденциальности | `https://woodmarkyouth.com/privacy/` |
| Авторские права (Copyright) | `2026 Woodmark Church` |
| Цена | Бесплатно, без встроенных покупок |
| Где доступно | Только США (группа одна, в Kirkland) — можно расширить позже |
| Шифрование (Export Compliance) | Только стандартное HTTPS → «нет своего шифрования». В `app.json` это уже отмечено, вопрос при загрузке сборки не появится. |

### Возрастной рейтинг (Age Rating)

Приложение только для 13+. В анкете Apple:

| Вопрос | Ответ |
|---|---|
| Содержимое от пользователей (чат, комментарии, фото) | **Да** |
| Есть ли жалобы, блокировка и модерация | **Да** (Report, Block, лидеры удаляют; разбор жалоб в течение 24 часов) |
| Обмен сообщениями между пользователями | **Да** (общий чат группы; личных переписок нет) |
| Свободный доступ в интернет, реклама, азартные игры, покупки | Нет |
| Насилие, сексуальное содержимое, алкоголь/наркотики, ужасы | Нет |
| Медицинская информация | Нет |

Если анкета выдаст рейтинг ниже 13+, поднять вручную до **13+** (поле «Age Rating Override»).
Раздел **Kids / Made for Kids не выбирать** — приложение не для детей младше 13.

### Конфиденциальность (App Privacy — «этикетка» в магазине)

Отслеживания (Tracking) нет. Данные не передаются рекламным сетям и не продаются.

| Тип данных у Apple | Собираем? | Привязано к человеку | Зачем |
|---|---|---|---|
| Contact Info → Name | Да | Да | App Functionality |
| Contact Info → Email Address | Да | Да | App Functionality (вход по коду) |
| User Content → Photos or Videos | Да | Да | App Functionality |
| User Content → Other User Content (сообщения, комментарии, идеи) | Да | Да | App Functionality |
| Identifiers → User ID | Да | Да | App Functionality |
| Identifiers → Device ID (адрес телефона для уведомлений) | Да | Да | App Functionality |
| Other Data (день и месяц рождения — по желанию) | Да | Да | App Functionality |
| Location, Contacts, Health, Financial, Browsing/Search History, Purchases, Diagnostics, Usage Data | Нет | — | — |

Про анонимные вопросы: они хранятся без привязки к аккаунту, поэтому как «данные, привязанные к человеку» не указываются;
текст вопроса попадает в «Other User Content».

### Примечание для проверяющих (App Review Notes)

```review
Thanks for reviewing Woodmark Youth.

SIGN IN
Email: review@woodmarkyouth.com
Code: 246810
On the first screen tap "I already have an account", enter the email, tap "Send me a code", then enter the code above. No email is sent for this address.

This opens a demo group with sample people and sample content. We do this on purpose: the real group is a private church youth group that includes minors (13 to 17), and we do not let anyone outside the group read their conversations. Every feature works in the demo group. In the Me tab you can switch between Member, Leader and Pastor to see the leader tools.

USER-GENERATED CONTENT
- Before joining, everyone confirms they are 13 or older and agrees to the group rules (zero tolerance for objectionable content and abusive users). The rules are in the app (Me > Group rules) and at https://woodmarkyouth.com/rules/
- Report: tap or hold any chat message, comment or idea > Report. Leaders get a push notification and review every report within 24 hours (Me > Reports for leaders).
- Block: tap or hold a message > Block. That person's content is hidden right away.
- Leaders can delete any message, comment, photo or album. The lead pastor can remove a person from the group (Me > Members); a removed person cannot join again with the same email.
- Delete account: Me > Delete account. It removes the account and its content right away.

ANONYMOUS QUESTIONS
Members can ask leaders a question without their name. The question is stored without any link to the account, and the conversation is deleted 7 days after the last message. Leaders can close a conversation.

SIGN-IN METHOD
Accounts use a one-time code sent by email. There are no passwords and no third-party sign-in.

CONTACT
hello@woodmarkyouth.com
```

## 3. Google Play

### Краткое описание (Short description, до 80 знаков)

```short
Daily word, group chat, events and a safe way to ask a leader anything.
```

### Полное описание (до 4000 знаков)

То же, что описание для App Store (блок `description` выше).

### Остальные поля

| Поле | Значение |
|---|---|
| Категория | Lifestyle |
| Контактная почта | `hello@woodmarkyouth.com` |
| Сайт | `https://woodmarkyouth.com` |
| Политика конфиденциальности | `https://woodmarkyouth.com/privacy/` |
| Удаление аккаунта (ссылка обязательна) | `https://woodmarkyouth.com/privacy/#deleting-your-information` |
| Целевая аудитория | 13–15, 16–17, 18+ (младше 13 **не** отмечать) |
| Реклама | Нет |
| Доступ для проверки | Те же адрес и код, что для Apple: `review@woodmarkyouth.com` / `246810` |

### Безопасность данных (Data safety)

| Вопрос | Ответ |
|---|---|
| Собирает ли приложение данные | Да |
| Шифруются ли данные при передаче | Да |
| Можно ли запросить удаление данных | Да (в приложении и по ссылке выше) |
| Передаются ли данные третьим лицам | Нет (сервисы, на которых работает приложение, по правилам Google «передачей» не считаются) |
| Personal info → Name, Email address | Собираются, обязательны, для работы приложения и управления аккаунтом |
| Personal info → Other info (день и месяц рождения) | Собирается, по желанию |
| Photos and videos | Собираются, по желанию |
| Messages → Other in-app messages | Собираются, для работы приложения |
| Device or other IDs (адрес для уведомлений) | Собираются, для работы приложения |
| Location, Financial, Health, Contacts, Web history, App activity, Diagnostics | Не собираются |

## 4. Что внесено в App Store Connect (2026-11-20)

**Отправлено на проверку Apple 2026-11-20 в 15:09 по тихоокеанскому времени: версия 1.0, сборка 5. **

**Одобрено Apple 2026-11-20 в 17:15 (через два часа после отправки, без вопросов и замечаний). Письма: «Review of your submission is complete» и «Welcome to the App Store». Выпуск был ручной.**

**Выпущено 2026-11-20 вечером по слову владельца: нажата Release This Version, статус — «Ready for Distribution», страна — только США. Ссылка: https://apps.apple.com/app/woodmark-youth/id6837481209 (Apple раскладывает приложение по магазину до 24 часов).**
Apple обещает ответ в пределах 48 часов, письмо придёт на почту аккаунта разработчика.

- **Тексты:** рекламный текст, описание, ключевые слова, подзаголовок, адреса поддержки и сайта, авторские права — как в разделе 2.
- **Снимки экранов:** пять штук — главная, чат, события, анонимные вопросы, альбомы. Исходники 1320×2868 лежат в `store/screenshots/ios`,
  загруженный в магазин набор 1206×2622 — в `store/screenshots/ios-6.3` (слот «iPhone 6.1"/6.3"» другого размера не принимает,
  Apple сам масштабирует его на остальные iPhone). Сняты в симуляторе iPhone 17 Pro Max в демо-группе.
- **Категории:** Lifestyle, дополнительная — Social Networking.
- **Права на содержимое:** стороннего содержимого нет.
- **Возрастной рейтинг:** по анкете выходило 4+, вручную поднято до **13+**. Ответы в новой анкете Apple:
  User-Generated Content — да; Messaging and Chat — да; Parental Controls, Age Assurance, Unrestricted Web Access, Social Media,
  Shared Location, Advertising — нет; все разделы про содержимое (грубость, страх, алкоголь, знакомства, медицина, секс, насилие,
  азартные игры) — нет. «Age Assurance» отмечено «нет» намеренно: галочка «I'm 13 or older» — это заявление самого человека,
  а не проверка возраста. «Social Media» — «нет»: ленты и рекомендаций нет, группа закрытая.
- **Цена:** бесплатно. **Где доступно:** только США.
- **Конфиденциальность:** адрес политики и семь типов данных из таблицы выше; у каждого — «App Functionality», привязано к человеку,
  для отслеживания не используется. Опубликовано 2026-11-20.
- **Сборка:** 5 (1.0.0). Сборку 4 Apple на проверку не принял: она заявляла поддержку iPad и требовала снимков для iPad 13". На iPad экраны растягивались на всю ширину, поэтому поддержка iPad выключена (`ios.supportsTablet: false` в `app.json`): приложение только для iPhone, на iPad открывается в окне размером с телефон.
- **Выпуск после одобрения:** вручную («Manually release this version») — приложение не появится в магазине само, пока владелец не нажмёт Release.
- **Вход для проверяющего:** адрес, код и примечания внесены; контактные данные владельца (имя, телефон) он внёс сам, почта для связи — `hello@woodmarkyouth.com`.

## 5. Чего ещё нет

- **Картинка для Google Play (Feature graphic)** 1024×500 — нарисовать в стиле иконки.
- **Аккаунт Google Play** ($25 разово) — на кого оформлять, не решено.
- **Снимки для Google Play** — подойдут те же экраны, снять на Android или пересохранить.
