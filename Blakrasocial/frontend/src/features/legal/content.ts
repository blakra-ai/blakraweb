/** Public legal texts that Meta, TikTok and LinkedIn ask for during app review. They describe what
 *  this app actually does (see the backend): keep them in sync if data handling changes. */
export type LegalDoc = "privacy" | "terms" | "deletion";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalText {
  title: string;
  sections: LegalSection[];
}

export interface LegalVars {
  company: string;
  email: string;
  site: string;
}

type Builder = (v: LegalVars) => LegalText;

const en: Record<LegalDoc, Builder> = {
  privacy: ({ company, email, site }) => ({
    title: "Privacy policy",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          `${site} ("Blakrasocial") is a tool operated by ${company} that lets our customers write one post and publish it to the social accounts they connect. Questions about privacy: ${email}.`,
        ],
      },
      {
        heading: "What we collect",
        paragraphs: [
          "Account details: your name, email address and a hashed password (we never store the password itself). We record when you last signed in.",
          "Connected social accounts: when you connect Instagram, Facebook, TikTok, LinkedIn or WhatsApp, the network gives us an access token and basic profile details (account id, name or username, profile picture). Tokens are encrypted with AES-256-GCM before they are stored.",
          "Content you publish: the text, photos and videos you upload, the networks you choose, schedule times, and the result each network returns (post id, link or error).",
          "Technical data: IP address and request logs, kept for security and troubleshooting.",
        ],
      },
      {
        heading: "How we use it",
        paragraphs: [
          "Only to provide the service: to sign you in, to publish the posts you ask us to publish, at the time you choose, to the accounts you connected, and to show you the result.",
          "We read data from your social accounts only as far as publishing requires (for example, TikTok's privacy options before each post). We do not read your messages, followers or analytics.",
          "We do not sell your data, use it for advertising or share it with data brokers.",
        ],
      },
      {
        heading: "Who receives it",
        paragraphs: [
          "The social network you publish to receives the post and media you send to it, under that network's own terms and privacy policy.",
          "Our infrastructure providers (server hosting, database and file storage) process data on our behalf and only to run the service.",
          "We disclose data to authorities only when the law requires it.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "Access tokens are deleted as soon as you disconnect an account, remove the app in the network's settings, or close your account.",
          "Uploaded media and post history are kept while your account is open so you can see what was published, and deleted when the account is closed. Sign-in sessions expire after 30 days.",
        ],
      },
      {
        heading: "Your rights and choices",
        paragraphs: [
          `You can disconnect any social account at any time on the Connections page. You can ask us for a copy of your data, a correction or deletion by writing to ${email}. You can also remove the app from your Facebook, Instagram, TikTok or LinkedIn settings; we then delete the related data automatically (see the data deletion page).`,
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "Traffic is encrypted with HTTPS. Passwords are hashed with Argon2id, tokens are encrypted at rest, sign-in sessions use secure HttpOnly cookies, and access is limited to the account owner.",
        ],
      },
      { heading: "Changes", paragraphs: ["If we change this policy we will update this page and, for important changes, tell you by email."] },
    ],
  }),
  terms: ({ company, email, site }) => ({
    title: "Terms of service",
    sections: [
      { heading: "The service", paragraphs: [`${site} is provided by ${company}. It publishes the content you prepare to the social accounts you connect. By using it you agree to these terms.`] },
      {
        heading: "Your account",
        paragraphs: [
          "Accounts are created by invitation. Keep your password private; you are responsible for activity on your account. Tell us right away if you think someone else has access.",
        ],
      },
      {
        heading: "Your content",
        paragraphs: [
          "You keep ownership of everything you publish. You confirm you have the rights to it, including music, images and the people shown, and that it follows the rules of each network you publish to (for example TikTok's Community Guidelines, Music Usage Confirmation and Branded Content Policy, Meta's Community Standards and LinkedIn's Professional Community Policies).",
          "You give us permission to store and send your content only to publish it where you asked.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "Do not use the service for spam, unsolicited messages, misleading or illegal content, or to break any network's rules or rate limits. WhatsApp messages may only be sent to people who agreed to receive them.",
        ],
      },
      {
        heading: "Networks and availability",
        paragraphs: [
          "Each social network decides whether to accept a post and may change its rules or limits at any time. We show you each network's answer but cannot guarantee that a network will publish or keep a post.",
        ],
      },
      {
        heading: "Ending",
        paragraphs: [`You can stop using the service at any time and ask for your account to be closed at ${email}. We may suspend accounts that break these terms.`],
      },
      {
        heading: "Liability",
        paragraphs: ["The service is provided as is. To the extent the law allows, we are not liable for indirect losses or for the actions of the social networks."],
      },
      { heading: "Contact", paragraphs: [email] },
    ],
  }),
  deletion: ({ email }) => ({
    title: "Data deletion",
    sections: [
      {
        heading: "Remove a single connection",
        paragraphs: ["Sign in, open Connections and choose Disconnect. The stored access token for that network is deleted immediately."],
      },
      {
        heading: "Remove the app from Facebook or Instagram",
        paragraphs: [
          "Go to Settings → Apps and websites (Facebook) or Settings → Website permissions → Apps and websites (Instagram) and remove the app, choosing to delete your data. Meta notifies us and we delete the tokens for your account automatically. You receive a confirmation code and a link where you can check the status.",
        ],
      },
      {
        heading: "Remove the app from TikTok or LinkedIn",
        paragraphs: ["Remove the app from Manage app permissions in TikTok or LinkedIn. The stored token stops working right away and can no longer be used. Disconnect it here as well to delete it from our database immediately."],
      },
      {
        heading: "Delete everything",
        paragraphs: [`To delete your whole account, including post history and uploaded media, email ${email} from your account's address. We confirm and complete it within 30 days.`],
      },
    ],
  }),
};

const fa: Record<LegalDoc, Builder> = {
  privacy: ({ company, email, site }) => ({
    title: "سیاست حریم خصوصی",
    sections: [
      { heading: "ما که هستیم", paragraphs: [`${site} (بلاکراسوشال) ابزاری است که ${company} اداره می‌کند و به مشتری‌ها امکان می‌دهد یک پست بنویسند و آن را در حساب‌های اجتماعی متصل‌شده منتشر کنند. پرسش‌های حریم خصوصی: ${email}`] },
      {
        heading: "چه اطلاعاتی جمع می‌کنیم",
        paragraphs: [
          "اطلاعات حساب: نام، ایمیل و رمز عبورِ هش‌شده (خود رمز هرگز ذخیره نمی‌شود) و زمان آخرین ورود.",
          "حساب‌های اجتماعی متصل: وقتی اینستاگرام، فیس‌بوک، تیک‌تاک، لینکدین یا واتس‌اپ را وصل می‌کنید، آن شبکه یک توکن دسترسی و اطلاعات پایهٔ پروفایل (شناسه، نام یا نام کاربری، تصویر) به ما می‌دهد. توکن‌ها پیش از ذخیره با AES-256-GCM رمزنگاری می‌شوند.",
          "محتوایی که منتشر می‌کنید: متن، عکس و ویدئو، شبکه‌های انتخابی، زمان‌بندی و پاسخ هر شبکه (شناسه، لینک یا خطا).",
          "اطلاعات فنی: نشانی IP و گزارش درخواست‌ها برای امنیت و رفع اشکال.",
        ],
      },
      {
        heading: "چگونه استفاده می‌کنیم",
        paragraphs: [
          "فقط برای ارائهٔ خدمت: ورود شما، انتشار پست‌هایی که خودتان می‌خواهید، در زمانی که انتخاب می‌کنید، در حساب‌هایی که وصل کرده‌اید، و نمایش نتیجه.",
          "از حساب‌های اجتماعی شما فقط همان اندازه که برای انتشار لازم است می‌خوانیم (مثلاً گزینه‌های حریم خصوصی تیک‌تاک پیش از هر پست). پیام‌ها، دنبال‌کننده‌ها یا آمار شما را نمی‌خوانیم.",
          "اطلاعات شما را نمی‌فروشیم، برای تبلیغات استفاده نمی‌کنیم و به دلالان داده نمی‌دهیم.",
        ],
      },
      {
        heading: "چه کسانی دریافت می‌کنند",
        paragraphs: [
          "شبکهٔ اجتماعی مقصد، پست و فایل‌هایی را که برایش می‌فرستید طبق قوانین و سیاست حریم خصوصی خودش دریافت می‌کند.",
          "ارائه‌دهندگان زیرساخت ما (سرور، پایگاه داده و فضای ذخیرهٔ فایل) فقط برای اجرای خدمت و از طرف ما داده را پردازش می‌کنند.",
          "فقط در صورت الزام قانونی اطلاعات را در اختیار مراجع قانونی قرار می‌دهیم.",
        ],
      },
      {
        heading: "مدت نگهداری",
        paragraphs: [
          "توکن‌ها به محض قطع اتصال، حذف برنامه از تنظیمات شبکه یا بستن حساب پاک می‌شوند.",
          "فایل‌ها و تاریخچهٔ پست‌ها تا زمانی که حساب باز است نگه داشته می‌شوند و با بستن حساب حذف می‌شوند. نشست‌های ورود پس از ۳۰ روز منقضی می‌شوند.",
        ],
      },
      { heading: "حقوق و انتخاب‌های شما", paragraphs: [`هر زمان می‌توانید از صفحهٔ «اتصال حساب‌ها» اتصال را قطع کنید. برای دریافت نسخه‌ای از اطلاعات، اصلاح یا حذف آن به ${email} بنویسید. همچنین می‌توانید برنامه را از تنظیمات فیس‌بوک، اینستاگرام، تیک‌تاک یا لینکدین حذف کنید؛ در این صورت اطلاعات مربوط به‌طور خودکار پاک می‌شود (صفحهٔ حذف اطلاعات را ببینید).`] },
      { heading: "امنیت", paragraphs: ["ارتباط با HTTPS رمزنگاری می‌شود. رمزها با Argon2id هش می‌شوند، توکن‌ها رمزنگاری‌شده ذخیره می‌شوند، نشست‌ها از کوکی امن HttpOnly استفاده می‌کنند و دسترسی فقط برای صاحب حساب است."] },
      { heading: "تغییرات", paragraphs: ["اگر این سیاست تغییر کند همین صفحه به‌روز می‌شود و برای تغییرات مهم به شما ایمیل می‌زنیم."] },
    ],
  }),
  terms: ({ company, email, site }) => ({
    title: "شرایط استفاده",
    sections: [
      { heading: "خدمت", paragraphs: [`${site} را ${company} ارائه می‌کند. این ابزار محتوایی را که آماده می‌کنید در حساب‌های اجتماعی متصل شما منتشر می‌کند. با استفاده از آن این شرایط را می‌پذیرید.`] },
      { heading: "حساب شما", paragraphs: ["حساب‌ها با دعوت‌نامه ساخته می‌شوند. رمز خود را محرمانه نگه دارید؛ مسئولیت فعالیت حساب با شماست. اگر فکر می‌کنید کس دیگری دسترسی دارد فوراً خبر دهید."] },
      {
        heading: "محتوای شما",
        paragraphs: [
          "مالکیت محتوای شما با خودتان است. تأیید می‌کنید حق انتشار آن (از جمله موسیقی، تصاویر و افراد حاضر در آن) را دارید و با قوانین هر شبکه سازگار است (مانند رهنمودهای جامعهٔ تیک‌تاک، تأیید استفاده از موسیقی و سیاست محتوای تبلیغاتی، استانداردهای جامعهٔ متا و سیاست‌های لینکدین).",
          "به ما اجازه می‌دهید محتوا را فقط برای انتشار در جایی که خواسته‌اید ذخیره و ارسال کنیم.",
        ],
      },
      { heading: "استفادهٔ مجاز", paragraphs: ["از این خدمت برای اسپم، پیام ناخواسته، محتوای گمراه‌کننده یا غیرقانونی، یا دور زدن قوانین و محدودیت‌های شبکه‌ها استفاده نکنید. پیام واتس‌اپ فقط به کسانی فرستاده شود که موافقت کرده‌اند."] },
      { heading: "شبکه‌ها و در دسترس بودن", paragraphs: ["هر شبکه خودش تصمیم می‌گیرد پستی را بپذیرد یا نه و ممکن است قوانینش را تغییر دهد. پاسخ هر شبکه را نشان می‌دهیم ولی نمی‌توانیم انتشار یا ماندن پست را تضمین کنیم."] },
      { heading: "پایان استفاده", paragraphs: [`هر زمان می‌توانید استفاده را متوقف کنید و بستن حساب را از ${email} بخواهید. حساب‌هایی که این شرایط را نقض کنند ممکن است مسدود شوند.`] },
      { heading: "مسئولیت", paragraphs: ["خدمت «همان‌گونه که هست» ارائه می‌شود. تا جایی که قانون اجازه می‌دهد مسئولیتی در قبال زیان‌های غیرمستقیم یا اقدامات شبکه‌های اجتماعی نداریم."] },
      { heading: "تماس", paragraphs: [email] },
    ],
  }),
  deletion: ({ email }) => ({
    title: "حذف اطلاعات",
    sections: [
      { heading: "قطع یک اتصال", paragraphs: ["وارد شوید، به «اتصال حساب‌ها» بروید و «قطع اتصال» را بزنید. توکن ذخیره‌شدهٔ آن شبکه فوراً پاک می‌شود."] },
      { heading: "حذف برنامه از فیس‌بوک یا اینستاگرام", paragraphs: ["در تنظیمات، بخش «برنامه‌ها و وب‌سایت‌ها»، برنامه را حذف کنید و گزینهٔ حذف اطلاعات را بزنید. متا به ما خبر می‌دهد و توکن‌های حساب شما خودکار پاک می‌شود. یک کد تأیید و لینکی برای دیدن وضعیت دریافت می‌کنید."] },
      { heading: "حذف برنامه از تیک‌تاک یا لینکدین", paragraphs: ["برنامه را از بخش مدیریت دسترسی برنامه‌ها حذف کنید. توکن ذخیره‌شده همان لحظه از کار می‌افتد و دیگر قابل استفاده نیست. برای پاک شدن فوری آن از پایگاه داده، اینجا هم قطع اتصال کنید."] },
      { heading: "حذف همه چیز", paragraphs: [`برای حذف کامل حساب، شامل تاریخچهٔ پست‌ها و فایل‌ها، از ایمیل حساب خود به ${email} بنویسید. ظرف ۳۰ روز انجام و تأیید می‌شود.`] },
    ],
  }),
};

export function legalText(doc: LegalDoc, language: string, vars: LegalVars): LegalText {
  return (language.startsWith("fa") ? fa : en)[doc](vars);
}
