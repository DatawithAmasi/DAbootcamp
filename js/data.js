/* data.js — الإعدادات والجلسات والأوسمة
   - ملف عام يُرفع مع الموقع: لا تضع فيه رموزًا ولا إجابات
   - الاختبارات والمهام في Code.gs */
/* api: رابط Web app من Apps Script (مطلوب) — باقي الإعدادات تُعدَّل من لوحة التحكم */
window.SITE = {
  api: "https://script.google.com/macros/s/AKfycbz4hOVxuQRgEH2gnUSC3qeNcVeweQHrQm2gqI16PDxkDqxNgWow_-XisnQgFra9sp49/exec",

  name: "معسكر مسار البيانات الذكي",
  nameEn: "Smart Data Path Bootcamp — Advanced Data Analytics",
  shortName: "مسار البيانات الذكي",
  footerNote: "معسكر عملي في تحليل البيانات المتقدم: 5 أسابيع، من 23 نوفمبر إلى 23 ديسمبر.",
  trainer: "المدربـة",
  presenter: "تقديم وبرمجة: م.أماسي",
  startDate: "2026-11-23",
  endDate: "2026-12-23",
  sessionDays: [0, 2],
  sessionTime: "",
  sessionHour: 20,
  sessionMinute: 0,
  sessionLength: "ساعة ونصف",
  lateAfterMin: 15,

  heroPre: "من البيانات الخام إلى", heroAccent: "القرار الذكي", heroPost: "في خمسة أسابيع",
  heroLead: "معسكر عملي مكثف في تحليل البيانات المتقدم، من معالجة البيانات الضخمة إلى توظيف الذكاء الاصطناعي.",
  progressNote: "",
  nextNote: "",

  about: "معسكر عملي يأخذك من معالجة البيانات الضخمة إلى استخدام الذكاء الاصطناعي في أتمتة التقارير واستخلاص الرؤى.",
  audience: "لمن لديه أساسيات في بايثون وتحليل البيانات ويريد الانتقال إلى مستوى متقدم.",
  axes: ["معالجة البيانات الضخمة","السلاسل الزمنية والنصوص","التحليل التنبؤي والتشخيصي","أتمتة التقارير","مشروع عملي"],
  timing: ["5 أسابيع: 4 للتدريب وأسبوع للمشروع","من 23 نوفمبر إلى 23 ديسمبر","جلستان أسبوعيًا (الاثنين والأربعاء)، ساعة ونصف لكل جلسة"],
  notes: ["الحضور والتفاعل أساس الاستفادة","اكتب أسئلتك في القسم المخصص لها في مجموعة التليقرام","في كل أسبوع مهمة أو اختبار، ونقاش في المجموعة","الأجندة مرنة وقد تتعدل"],

  unlocked: [],

  otpMinutes: 5,

  repo: "YOUR-USERNAME/YOUR-REPO",
  formEndpoint: ""
};

window.WEEKS = [
  { n: 1, color: "blue",   emoji: "🟦", title: "Data Wrangling & EDA", ar: "معالجة واستكشاف البيانات الحديثة",
    goal: "التعامل مع البيانات الضخمة وتنظيفها، واستخلاص المؤشرات واكتشاف القيم الشاذة." },
  { n: 2, color: "yellow", emoji: "🟨", title: "Predictive Analytics & Clustering", ar: "التحليل التنبؤي وتجميع البيانات",
    goal: "بناء نموذج تنبؤي وتقييمه، وتجميع البيانات بـ K-Means و PCA." },
  { n: 3, color: "orange", emoji: "🟧", title: "Time-Series & Text Analytics", ar: "تحليل السلاسل الزمنية والنصوص",
    goal: "التنبؤ بالاتجاهات المستقبلية وتحويل النصوص إلى مؤشرات رقمية." },
  { n: 4, color: "green",  emoji: "🟩", title: "AI-Assisted Analytics & Reporting", ar: "الذكاء الاصطناعي كأداة مساعدة للمحلل",
    goal: "أتمتة التقارير والاستفسار التفاعلي بالذكاء الاصطناعي." },
  { n: 5, color: "gold",   emoji: "🏁", title: "Final Project", ar: "العمل على المشروع النهائي للمعسكر", project: true,
    goal: "تقرير عملي متكامل يحل مشكلة واقعية، من المعالجة إلى التوصيات." }
];

/* colab / refs / videos تُعدَّل من الإدارة ← الجلسات */
window.SESSIONS = [
  {
    "n": 1,
    "week": 1,
    "ar": "التعريف بالمعسكر والمنصة، ومدخل إلى معالجة البيانات",
    "en": "Bootcamp & Platform Orientation + Gateway to Data Processing",
    "desc": "نتعرّف على المعسكر ومساره وكيفية الاستفادة من المنصة والتعليمات، ثم مدخل يمهّد لمعالجة البيانات الضخمة في الجلسة التالية.",
    "topics": [
      "التعريف بالمعسكر وأهدافه ومساره الأسبوعي",
      "جولة في المنصة: الأجندة والمتابعة والتمارين والأسئلة",
      "التعليمات: تسجيل الحضور (رمز الجلسة) وتسليم المهام والاختبارات",
      "نظام النقاط والأوسمة وكيف تتقدّم فيه",
      "التجهيز: Google Colab وحساب GitHub ومجموعة التليقرام",
      "مدخل للجلسة القادمة: لماذا نحتاج أدوات أسرع من Pandas؟"
    ],
    "colab": "",
    "refs": [
      {
        "t": "Google Colab",
        "u": "https://colab.research.google.com/"
      },
      {
        "t": "Polars User Guide",
        "u": "https://docs.pola.rs/"
      }
    ],
    "videos": [
      {
        "t": "Polars vs Pandas",
        "q": "polars vs pandas performance"
      }
    ]
  },
  {
    "n": 2,
    "week": 1,
    "ar": "التعامل مع البيانات ضخمة الحجم بـ Polars وأساسيات التنظيف",
    "en": "Big Data Handling with Polars & Cleaning Basics",
    "desc": "معالجة ملايين الصفوف بسرعة باستخدام Polars، وأساسيات التنظيف والقيم المفقودة.",
    "topics": [
      "لماذا يبطؤ Pandas؟ الذاكرة وخيط المعالجة الواحد",
      "Polars: Expressions و Lazy API",
      "scan_csv / collect و Parquet",
      "مقارنة زمنية Pandas ↔ Polars",
      "التعامل مع القيم المفقودة: isna و fill و drop",
      "مقدمة موجزة: مؤشرات الأداء KPIs والقيم الشاذة (IQR)"
    ],
    "colab": "",
    "refs": [
      {
        "t": "Polars User Guide",
        "u": "https://docs.pola.rs/"
      },
      {
        "t": "Python for Data Analysis — W. McKinney",
        "u": "https://wesmckinney.com/book/"
      }
    ],
    "videos": [
      {
        "t": "Polars vs Pandas",
        "q": "polars vs pandas performance"
      }
    ]
  },
  {
    "n": 3,
    "week": 2,
    "ar": "بناء نموذج تنبؤي متكامل: التصنيف والانحدار",
    "en": "Predictive Modeling: Classification & Regression",
    "desc": "بناء نموذج تنبؤي وتقييمه وتفسير نتائجه.",
    "topics": [
      "Pipeline في scikit-learn",
      "Train / Test و Cross-Validation",
      "المقاييس: Accuracy, F1, RMSE",
      "Overfitting وكيف نكتشفه",
      "تفسير المخرجات لاتخاذ القرار"
    ],
    "colab": "",
    "refs": [
      {
        "t": "scikit-learn: Supervised Learning",
        "u": "https://scikit-learn.org/stable/supervised_learning.html"
      },
      {
        "t": "Kaggle: Intro to Machine Learning",
        "u": "https://www.kaggle.com/learn/intro-to-machine-learning"
      }
    ],
    "videos": [
      {
        "t": "Machine Learning Fundamentals",
        "q": "statquest machine learning fundamentals bias variance"
      }
    ]
  },
  {
    "n": 4,
    "week": 2,
    "ar": "التجميع وتحديد الأنماط الخفية: K-Means و PCA",
    "en": "Clustering & Hidden Patterns: K-Means & PCA",
    "desc": "تجميع البيانات بـ K-Means و PCA واكتشاف الأنماط.",
    "topics": [
      "PCA والتباين المفسَّر",
      "K-Means و Elbow / Silhouette",
      "تقسيم العملاء Customer Segmentation",
      "تفسير المجموعات"
    ],
    "colab": "",
    "refs": [
      {
        "t": "scikit-learn: PCA",
        "u": "https://scikit-learn.org/stable/modules/decomposition.html#pca"
      },
      {
        "t": "scikit-learn: Clustering",
        "u": "https://scikit-learn.org/stable/modules/clustering.html"
      }
    ],
    "videos": [
      {
        "t": "PCA step-by-step — StatQuest",
        "q": "statquest pca step by step"
      }
    ]
  },
  {
    "n": 5,
    "week": 3,
    "ar": "السلاسل الزمنية: التنبؤ بالاتجاهات المستقبلية",
    "en": "Time-Series: Forecasting Future Trends",
    "desc": "التنبؤ بالمبيعات والطلب بنماذج السلاسل الزمنية.",
    "topics": [
      "الاتجاه والموسمية و Stationarity",
      "Lag Features و Rolling Windows",
      "التقسيم الزمني الصحيح للبيانات",
      "نماذج التنبؤ ومقاييس الخطأ"
    ],
    "colab": "",
    "refs": [
      {
        "t": "Kaggle: Time Series",
        "u": "https://www.kaggle.com/learn/time-series"
      },
      {
        "t": "statsmodels: Time Series Analysis",
        "u": "https://www.statsmodels.org/stable/tsa.html"
      }
    ],
    "videos": [
      {
        "t": "Time Series Forecasting — Rob Mulla",
        "q": "rob mulla time series forecasting"
      }
    ]
  },
  {
    "n": 6,
    "week": 3,
    "ar": "تحليل النصوص: من التقييمات إلى مؤشرات رقمية",
    "en": "Text Analytics: From Reviews to Numeric Indicators",
    "desc": "تحويل النصوص والتقييمات إلى مؤشرات رقمية.",
    "topics": [
      "تنظيف النص والـ Tokenization",
      "TF-IDF",
      "Sentiment Analysis بنماذج Hugging Face",
      "استخلاص الكلمات المفتاحية"
    ],
    "colab": "",
    "refs": [
      {
        "t": "Hugging Face NLP Course",
        "u": "https://huggingface.co/learn/nlp-course"
      },
      {
        "t": "Kaggle: Natural Language Processing",
        "u": "https://www.kaggle.com/learn/natural-language-processing"
      }
    ],
    "videos": [
      {
        "t": "Sentiment Analysis with Transformers",
        "q": "sentiment analysis hugging face transformers python"
      }
    ]
  },
  {
    "n": 7,
    "week": 4,
    "ar": "الذكاء الاصطناعي كأداة مساعدة: البحث والاستفسار التفاعلي",
    "en": "AI-Assisted Analytics: Search & Interactive Querying",
    "desc": "استخدام الذكاء الاصطناعي للاستفسار عن البيانات واستخلاص الرؤى.",
    "topics": [
      "معمارية RAG خطوة بخطوة",
      "Chunking والتضمين والاسترجاع",
      "هندسة الـ Prompt للتحليل",
      "تقليل الهلوسة وتقييم الإجابات"
    ],
    "colab": "",
    "refs": [
      {
        "t": "DeepLearning.AI Short Courses",
        "u": "https://www.deeplearning.ai/short-courses/"
      },
      {
        "t": "LangChain Docs",
        "u": "https://python.langchain.com/"
      }
    ],
    "videos": [
      {
        "t": "RAG from Scratch",
        "q": "RAG from scratch langchain james briggs"
      }
    ]
  },
  {
    "n": 8,
    "week": 4,
    "ar": "أتمتة التقارير وتجهيز المشروع النهائي",
    "en": "Report Automation & Final Project Kickoff",
    "desc": "أتمتة التقارير، ثم الانطلاق في المشروع النهائي.",
    "topics": [
      "أتمتة التقرير التحليلي من البيانات إلى النص",
      "حكاية البيانات Data Storytelling",
      "هيكلة المشروع وREADME احترافي",
      "معايير تقييم المشروع النهائي"
    ],
    "colab": "",
    "refs": [
      {
        "t": "About READMEs (GitHub Docs)",
        "u": "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes"
      }
    ],
    "videos": [
      {
        "t": "Data Storytelling",
        "q": "data storytelling presentation tips"
      }
    ]
  }
];


window.RESOURCES = [
  {
    "week": 1,
    "label": "Data Wrangling & EDA",
    "book": {
      "t": "Python for Data Analysis (W. McKinney)",
      "u": "https://wesmckinney.com/book/"
    },
    "platform": {
      "t": "DataCamp (Polars & Pandas)",
      "u": "https://www.datacamp.com/"
    },
    "channel": {
      "t": "StatQuest with Josh Starmer",
      "u": "https://www.youtube.com/@statquest"
    }
  },
  {
    "week": 2,
    "label": "Predictive & Clustering",
    "book": {
      "t": "Hands-On ML (Aurélien Géron)",
      "u": "https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/"
    },
    "platform": {
      "t": "Coursera (Stanford / Andrew Ng)",
      "u": "https://www.coursera.org/specializations/machine-learning-introduction"
    },
    "channel": {
      "t": "Daniel Bourke",
      "u": "https://www.youtube.com/@mrdbourke"
    }
  },
  {
    "week": 3,
    "label": "Time-Series & Text",
    "book": {
      "t": "NLP with Transformers (Hugging Face)",
      "u": "https://www.oreilly.com/library/view/natural-language-processing/9781098136789/"
    },
    "platform": {
      "t": "Kaggle Courses (NLP & Time-Series)",
      "u": "https://www.kaggle.com/learn"
    },
    "channel": {
      "t": "Rob Mulla",
      "u": "https://www.youtube.com/@robmulla"
    }
  },
  {
    "week": 4,
    "label": "AI-Assisted Analytics",
    "book": {
      "t": "Generative AI / Developing Apps with GPT-4",
      "u": "https://www.oreilly.com/search/?q=developing%20apps%20with%20gpt-4"
    },
    "platform": {
      "t": "DeepLearning.AI (RAG Short Courses)",
      "u": "https://www.deeplearning.ai/short-courses/"
    },
    "channel": {
      "t": "James Briggs",
      "u": "https://www.youtube.com/@jamesbriggs"
    }
  }
];

window.ALERTS = [];

window.STUDENTS = [];

window.PROJECTS = [];

window.TASKS = {
  assignments: [{ id: "a1", week: 1 }, { id: "a2", week: 2 }, { id: "a3", week: 3 }, { id: "a4", week: 4 }],
  project: { id: "p5", week: 5 }
};
window.QUIZZES = {};

window.FAQ = [
  { q: "كيف أسجّل حضوري؟", a: "أثناء الجلسة تضغط المدربـة «فتح التسجيل»، فتظهر لك خانة الرمز في صفحة «المتابعة». اكتب الرمز المكوّن من 4 أرقام الظاهر على الشاشة." },
  { q: "نسيت رمز الدخول، ماذا أفعل؟", a: "من شاشة الدخول اختر «متدرب» ← «لدي حساب» ← «نسيت الرمز؟» واكتب بريدك، يصلك الرمز على البريد." },
  { q: "هل يرى زملائي نقاطي؟", a: "لا. نقاطك خاصة بك وبالمدربـة والإدارة فقط. في لوحة المتصدرين تظهر الأسماء والترتيب والأوسمة فقط." },
  { q: "كيف أسلّم المهمة؟", a: "من صفحة «التمارين» ← المهمة المفتوحة: ضع رابط عملك أو ارفع ملف txt أو pdf، ويُسجَّل «مسلَّم» أو «متأخر» حسب الموعد." },
  { q: "هل تُحتسب إعادة الاختبار؟", a: "الدرجة المعتمدة هي محاولتك الأولى. يمكنك إعادة الاختبار متى شئت، وتُحفظ محاولاتك عند المدربـة وهو من يقرر إبقاءها أو حذفها." }
];

/* حدود xp يجب أن تطابق XP_LEVELS في Code.gs */
window.BADGES = {
  commit: [
    { t: "المجتهد",      d: "أسبوع ملتزم كامل",            c: "#34D399", c2: "#047857" },
    { t: "المتألق",      d: "أسبوعان ملتزمان متتاليان",     c: "#A78BFA", c2: "#6D28D9" },
    { t: "المتميز",      d: "3 أسابيع ملتزمة متتالية",      c: "#38A8FF", c2: "#1565C0" },
    { t: "نجم المعسكر",  d: "الأسابيع الأربعة كلها بالتزام", c: "#FFD54A", c2: "#E8960A" }
  ],
  points: [
    { t: "محلل مبتدئ", d: "اجمع 50 XP",  xp: 50,  c: "#34D399", c2: "#047857" },
    { t: "محلل متوسط", d: "اجمع 150 XP", xp: 150, c: "#A78BFA", c2: "#6D28D9" },
    { t: "محلل محترف", d: "اجمع 300 XP", xp: 300, c: "#38A8FF", c2: "#1565C0" },
    { t: "محلل خبير",  d: "اجمع 450 XP", xp: 450, c: "#FFD54A", c2: "#E8960A" }
  ]
};
