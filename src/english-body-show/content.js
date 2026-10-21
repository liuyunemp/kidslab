export const course = {
  "id": "english-body-show",
  "kind": "body",
  "title": {
    "zh": "身体动作秀",
    "en": "Body Action Show"
  },
  "icon": "👋",
  "category": "english",
  "levels": [
    "primary"
  ],
  "grades": [
    "g1",
    "g2",
    "g3"
  ],
  "tags": [
    "英语启蒙",
    "人体",
    "3D"
  ],
  "order": 244,
  "badge": "new",
  "description": {
    "zh": "从 16 个词中随机学 8 个，听音、认词、看图闯四关。",
    "en": "Learn eight of 16 words through listening, pictures and four challenges."
  },
  "invitation": {
    "zh": "听一听，找到它的朋友。",
    "en": "Listen and find its match."
  },
  "hint": {
    "zh": "先认识四个单词，再听音选图片。答错或超时会少一颗心。",
    "en": "Meet four words, then listen and choose a picture. A wrong answer or timeout costs one heart."
  },
  "items": [
    {
      "id": "head",
      "en": "head",
      "zh": "头",
      "visual": "head",
      "audio": "head",
      "sentence": "Touch your head.",
      "excludes": [
        "face",
        "hair"
      ]
    },
    {
      "id": "eye",
      "en": "eye",
      "zh": "眼睛",
      "visual": "eye",
      "audio": "eye",
      "sentence": "Touch your eye.",
      "excludes": []
    },
    {
      "id": "ear",
      "en": "ear",
      "zh": "耳朵",
      "visual": "ear",
      "audio": "ear",
      "sentence": "Touch your ear.",
      "excludes": []
    },
    {
      "id": "nose",
      "en": "nose",
      "zh": "鼻子",
      "visual": "nose",
      "audio": "nose",
      "sentence": "Touch your nose.",
      "excludes": []
    },
    {
      "id": "mouth",
      "en": "mouth",
      "zh": "嘴巴",
      "visual": "mouth",
      "audio": "mouth",
      "sentence": "Touch your mouth.",
      "excludes": []
    },
    {
      "id": "hand",
      "en": "hand",
      "zh": "手",
      "visual": "hand",
      "audio": "hand",
      "sentence": "Touch your hand.",
      "excludes": [
        "arm",
        "finger"
      ]
    },
    {
      "id": "arm",
      "en": "arm",
      "zh": "手臂",
      "visual": "arm",
      "audio": "arm",
      "sentence": "Touch your arm.",
      "excludes": [
        "hand"
      ]
    },
    {
      "id": "foot",
      "en": "foot",
      "zh": "脚",
      "visual": "foot",
      "audio": "foot",
      "sentence": "Touch your foot.",
      "excludes": [
        "toe"
      ]
    },
    {
      "id": "face",
      "en": "face",
      "zh": "脸",
      "visual": "face",
      "audio": "face",
      "sentence": "Touch your face.",
      "excludes": [
        "head"
      ]
    },
    {
      "id": "hair",
      "en": "hair",
      "zh": "头发",
      "visual": "hair",
      "audio": "hair",
      "sentence": "Touch your hair.",
      "excludes": [
        "head"
      ]
    },
    {
      "id": "neck",
      "en": "neck",
      "zh": "脖子",
      "visual": "neck",
      "audio": "neck",
      "sentence": "Touch your neck.",
      "excludes": []
    },
    {
      "id": "shoulder",
      "en": "shoulder",
      "zh": "肩膀",
      "visual": "shoulder",
      "audio": "shoulder",
      "sentence": "Touch your shoulder.",
      "excludes": []
    },
    {
      "id": "leg",
      "en": "leg",
      "zh": "腿",
      "visual": "leg",
      "audio": "leg",
      "sentence": "Touch your leg.",
      "excludes": [
        "knee"
      ]
    },
    {
      "id": "knee",
      "en": "knee",
      "zh": "膝盖",
      "visual": "knee",
      "audio": "knee",
      "sentence": "Touch your knee.",
      "excludes": [
        "leg"
      ]
    },
    {
      "id": "finger",
      "en": "finger",
      "zh": "手指",
      "visual": "finger",
      "audio": "finger",
      "sentence": "Touch your finger.",
      "excludes": [
        "hand"
      ]
    },
    {
      "id": "toe",
      "en": "toe",
      "zh": "脚趾",
      "visual": "toe",
      "audio": "toe",
      "sentence": "Touch your toe.",
      "excludes": [
        "foot"
      ]
    }
  ]
};
export const UI = {
  "zh": {
    "back": "返回平台",
    "language": "切换语言",
    "theme": "切换主题",
    "tools": "设置与帮助",
    "music": "背景音乐",
    "effects": "操作音效",
    "speech": "单词与引导朗读",
    "mute": "关闭全部声音",
    "unmute": "恢复声音",
    "on": "开",
    "off": "关",
    "stages": [
      "听听找找",
      "单词找朋友",
      "图片找名字",
      "综合挑战"
    ],
    "listen": "听一听，选出图片",
    "read": "找到这个单词的图片",
    "picture": "给图片找到英文名字",
    "learn": "先认识这个新朋友",
    "hear": "再听一次",
    "next": "继续",
    "begin": "开始挑战",
    "retry": "重试本关",
    "newRound": "再学一组",
    "resume": "继续挑战",
    "fallback": "改为看词题",
    "audioBlocked": "声音还没准备好，可以重试或改为看词。",
    "loading": "正在准备单词声音…",
    "paused": "已暂停，准备好再继续",
    "correct": "找对啦！",
    "wrong": "再找找，时间还在走哦。",
    "timeout": "时间到了，记住这个朋友吧。",
    "failed": "心用完啦，记住这些词再出发！",
    "levelDone": "这一关完成啦！",
    "roundDone": "本轮八个词，四关完成！",
    "review": "错词再见面",
    "learned": "已练过",
    "batch": "本轮 8 词",
    "round": "轮",
    "stage": "关",
    "hearts": "剩余生命",
    "seconds": "秒",
    "hint": "听听怎么玩",
    "nogl": "暂时打不开 3D 舞台，请启用浏览器图形加速后重试。",
    "help": "每题 20 秒，每关 3 颗心。选错可以重试，错词会再出现。",
    "visualOnly": "本题改为看词练习",
    "practice": "点一下，再听单词",
    "done": "这一轮完成啦！",
    "full": "这一轮完成啦！",
    "empty": "开始认识新单词吧。",
    "invalid": "请选一个选项。",
    "nothing": "继续挑战吧。",
    "same": "再找找。",
    "bag": "这是书包。"
  },
  "en": {
    "back": "Back to KidsLab",
    "language": "Switch language",
    "theme": "Switch theme",
    "tools": "Settings & help",
    "music": "Music",
    "effects": "Sound effects",
    "speech": "Words and guidance",
    "mute": "Mute all sounds",
    "unmute": "Restore sounds",
    "on": "On",
    "off": "Off",
    "stages": [
      "Listen & find",
      "Words & pictures",
      "Name the picture",
      "Mixed challenge"
    ],
    "listen": "Listen and choose a picture",
    "read": "Find the picture for this word",
    "picture": "Find the English name",
    "learn": "Meet a new friend",
    "hear": "Hear it again",
    "next": "Continue",
    "begin": "Start challenge",
    "retry": "Retry this level",
    "newRound": "Learn eight more",
    "resume": "Continue challenge",
    "fallback": "Use a written word",
    "audioBlocked": "Sound is not ready. Retry or use a written word.",
    "loading": "Getting the word ready…",
    "paused": "Paused. Continue when you are ready.",
    "correct": "You found it!",
    "wrong": "Try another one. The clock is still ticking.",
    "timeout": "Time is up. Meet this friend again.",
    "failed": "No hearts left. Meet these words and try again!",
    "levelDone": "Level complete!",
    "roundDone": "Eight words, four levels complete!",
    "review": "Meet this word again",
    "learned": "Practised",
    "batch": "8 words this round",
    "round": "Round",
    "stage": "Level",
    "hearts": "Hearts left",
    "seconds": "seconds",
    "hint": "Hear how to play",
    "nogl": "The 3D stage is unavailable. Enable browser graphics acceleration and try again.",
    "help": "20 seconds per question, 3 hearts per level. Try again after a mistake. Missed words return.",
    "visualOnly": "Written-word practice",
    "practice": "Tap to hear the word",
    "done": "This round is complete!",
    "full": "This round is complete!",
    "empty": "Meet some new words.",
    "invalid": "Choose an option.",
    "nothing": "Keep going.",
    "same": "Try another one.",
    "bag": "This is the bag."
  }
};
