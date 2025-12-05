# Frouk3.github.io

Статичний сайт-портфоліо/блог.

## Запуск локально
- Вимоги: Python 3.6+ (для простого сервера і генератора індексу блогу).
- З кореня репозиторію:
	```powershell
	python -m http.server 8000
	```
- Відкрийте: http://localhost:8000/

## Тести
- Встановити pytest (разово):
	```powershell
	pip install pytest
	```
- Запустити всі тести:
	```powershell
	pytest -q
	```
- Лише тести генератора блогу:
	```powershell
	pytest -q tools/tests/test_generate_blog_index.py
	```

## Генерація індексу блогу
- Скрипт на Python (рекомендується):
	```powershell
	python tools/generate_blog_index.py
	```
	Створює/оновлює `blog/posts.json`, сортує пости за часом зміни файлу (новіші зверху) і підхоплює `og:image` або перше `<img>` як превʼю (якщо немає — `../assets/not-found.svg`).
- Альтернативи: є версії на Node (`tools/generate_blog_index.js`) та Lua (`tools/generate_blog_index.lua`).

## Додавання нового поста
1) Додайте HTML-файл у `blog/` (наприклад, `blog/my-post.html`).
2) У `<head>` вкажіть:
	 - `<title>` (або `<h1>` у тілі).
	 - Бажано: `<meta property="og:image" content="https://.../preview.jpg">` для превʼю.
3) За потреби додайте рядок у `blog/posts.txt` (для секції "Recent Posts" на головній):
	 ```
	 Title|/blog/my-post.html|/assets/my-post.jpg
	 ```
4) Перегенеруйте індекс:
	 ```powershell
	 python tools/generate_blog_index.py
	 ```

## User Manual (коротко)
- Навігація: шапка з посиланнями Home / Projects / Blog / About / Contact.
- Blog (`/blog.html`): показує список постів з превʼю; клікайте картку, щоб перейти до поста. Футер і навбар фіксовані в стилі сайту.
- Recent Posts (на головній): бере останні записи з `blog/posts.txt` (три останні рядки) і показує картки превʼю.
- Коментарі: у пості `aboutme.html` (та інших, якщо додати) вбудований giscus; потрібен GitHub-аккаунт для коментарів.
- Contact: іконка Discord у розділі Contact веде до сервера Discord.
- Projects: перелік GitHub-проєктів із посиланнями.

## Корисні поради
- Після зміни стилів або контенту можна просто перезавантажити сторінку — збірка не потрібна (це статичний сайт).
- Якщо зʼявляються кешовані превʼю, змініть назву файла або додайте `?v=2` у `og:image` URL.
