---
tags: [publish-mcp, content-factory, mcp, distribution]
related: [[MEMORY]], [[projects/pulsepost]]
---
# Topic 8750 — publish-mcp (content factory MCP server)

## Статус
Код готов, GitHub repo опубликован. Следующий шаг: npm publish + листинг на registries.

## Что сделано
- 11 MCP tools: setup_brand, get_brand, analyze_competitors, find_sources, generate_post, translate_post, generate_media, publish, publish_all, list_channels, preview
- 5 AI-провайдеров: Gemini, OpenAI, Claude, Ollama, OpenAI-compatible
- 4 платформы публикации: Telegram, VK, MAX, Threads
- README.md (EN) + README.ru.md (RU)
- smithery.yaml для Smithery registry
- GitHub: https://github.com/devladpopov/publish-mcp

## Ключевые решения
- Bot API вместо MTProto (проще для generic пользователей)
- stdio transport only (стандарт MCP)
- Контент-завод, а не просто транспорт (идея Влада из голосового)
- Мульти-провайдер AI (включая бесплатный Ollama)

## Контекст
- Извлечено из PulsePost (C:\Users\Vlad\Projects\pulsepost\src\publish\)
- Стратегия "distribution for robots": MCP registries как канал дистрибуции
- Конкурентов в нише "social media publisher MCP" нет
- Цель: personal brand + authority в AI infrastructure
