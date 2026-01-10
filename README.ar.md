# مُحمل كتب الشاملة (EPUB)

> إضافة متصفح لتحويل كتب [المكتبة الشاملة](https://shamela.ws) إلى ملفات EPUB محليًا.

[![en](https://img.shields.io/badge/README-English-AB8B64.svg)](README.md)
[![ara](https://img.shields.io/badge/README-Arabic-AB8B64.svg)](README.ar.md)

<img src="src/assets/icon.png" alt="logo" style="max-width: 120px; height: auto; display: block;" />
<img src="assets/screenshot.png" alt="popup screenshot" style="max-width: 100%; height: auto; display: block;" />

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.png?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![GitHub release](https://img.shields.io/github/release/yshalsager/shamela-epub-exporter.svg)](https://github.com/yshalsager/shamela-epub-exporter/releases/)
[![GitHub Downloads](https://img.shields.io/github/downloads/yshalsager/shamela-epub-exporter/total.svg)](https://github.com/yshalsager/shamela-epub-exporter/releases/latest)
[![License](https://img.shields.io/github/license/yshalsager/shamela-epub-exporter.svg)](https://github.com/yshalsager/shamela-epub-exporter/blob/master/LICENSE)

[![PayPal](https://img.shields.io/badge/PayPal-Donate-00457C?style=flat&labelColor=00457C&logo=PayPal&logoColor=white&link=https://www.paypal.me/yshalsager)](https://www.paypal.me/yshalsager)
[![Liberapay](https://img.shields.io/badge/Liberapay-Support-F6C915?style=flat&labelColor=F6C915&logo=Liberapay&logoColor=white&link=https://liberapay.com/yshalsager)](https://liberapay.com/yshalsager)

**إخلاء مسؤولية:**

- هذا البرنامج مجاني ومفتوح المصدر ومخصص للاستخدام الشخصي أو التعليمي فقط.

## المزايا

- إنشاء كتاب EPUB3 باتجاه RTL.
- **التنزيل الجماعي**: إمكانية إضافة كتب متعددة لقائمة الانتظار.
- إضافة بطاقة معلومات الكتاب تلقائيًا.
- فهرس موضوعات متداخل مع خيار التسطيح.
- إضافة رقم الجزء والصفحة في تذييل كل صفحة.
- تنقية HTML وإزالة العناصر غير اللازمة وتحويل ألوان CSS المضمنة إلى أصناف.
- تحويل الهوامش إلى نوافذ منبثقة اختيارياً لتسهيل التنقل.
- **إدارة ذكية للمهام**: تنظيم التنزيل في الخلفية وإرسال إشعارات عند الاكتمال.

## التثبيت

### نسخة التطوير (تحميل يدوي)

```bash
mise x pnpm -- pnpm run dev
```

حمّل الإضافة من:

```bash
.output/chrome-mv3-dev
```

### نسخة الإنتاج (تحميل يدوي)

```bash
mise x pnpm -- pnpm run build
```

حمّل الإضافة من:

```bash
.output/chrome-mv3
```

## طريقة الاستخدام

1. افتح نافذة الإضافة.
2. ألصق روابط الكتب أو المعرّفات (كل رابط في سطر).
3. اضغط **بدء**.
4. ستبدأ الإضافة في معالجة الكتب واحداً تلو الآخر في الخلفية.
5. سيصلك إشعار عند اكتمال كل تنزيل.

## التطوير

يستخدم المشروع [mise](https://mise.jdx.dev/) لإدارة الأدوات والبيئة.

1. ثبّت mise.
2. شغّل `mise install` في مجلد المشروع.
3. شغّل خادم التطوير:

```bash
mise x pnpm -- pnpm run dev
```

## تقنية المشروع

- TypeScript + Svelte 5 (الواجهة)
- WXT + Vite (أدوات الإضافة)
- Tailwind CSS (الأنماط)
- JSZip (إنشاء EPUB)
- Wuchale (التوطين)

## الشكر والتقدير

يعتمد هذا المشروع على أدوات مفتوحة المصدر رائعة، منها:

- [Svelte](https://svelte.dev/)
- [WXT](https://wxt.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [JSZip](https://stuk.github.io/jszip/)
- [Wuchale](https://github.com/wuchalejs/wuchale)

## الخصوصية

اطلع على `PRIVACY.md`.
