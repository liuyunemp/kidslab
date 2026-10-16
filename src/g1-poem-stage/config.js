export const config = {
  "id": "g1-poem-stage",
  "kind": "poem",
  "category": "chinese",
  "grades": [],
  "tags": [
    "识字",
    "古诗"
  ],
  "icon": "🖼️",
  "title": {
    "zh": "诗画猜猜台",
    "en": "Poem Picture Stage"
  },
  "description": {
    "zh": "看画面猜诗句、接上下句，再把整首诗排回原顺序。",
    "en": "Match lines to pictures, finish couplets and order whole poems."
  },
  "accent": "#b0567a",
  "backdrop": "#fff0f5",
  "mascot": "🖼️",
  "tasks": [
    {
      "id": "q1",
      "form": "guess",
      "scene": "🦢💦",
      "title": {
        "zh": "咏鹅",
        "en": "A Goose"
      },
      "answer": "白毛浮绿水，",
      "choices": [
        "白毛浮绿水，",
        "曲项向天歌。",
        "红掌拨清波。"
      ]
    },
    {
      "id": "q2",
      "form": "guess",
      "scene": "⛰️🌸",
      "title": {
        "zh": "画",
        "en": "A Painting"
      },
      "answer": "春去花还在，",
      "choices": [
        "春去花还在，",
        "人来鸟不惊。",
        "近听水无声。"
      ]
    },
    {
      "id": "q3",
      "form": "guess",
      "scene": "🌕🐇",
      "title": {
        "zh": "古朗月行（节选）",
        "en": "A Bright Moon"
      },
      "answer": "小时不识月，",
      "choices": [
        "小时不识月，",
        "呼作白玉盘。",
        "飞在青云端。"
      ]
    },
    {
      "id": "q4",
      "form": "next",
      "line": "白毛浮绿水，",
      "answer": "红掌拨清波。",
      "choices": [
        "红掌拨清波。",
        "曲项向天歌。",
        "鹅，鹅，鹅。"
      ]
    },
    {
      "id": "q5",
      "form": "next",
      "line": "床前明月光，",
      "answer": "疑是地上霜。",
      "choices": [
        "疑是地上霜。",
        "举头望明月。",
        "低头思故乡。"
      ]
    },
    {
      "id": "q6",
      "form": "next",
      "line": "锄禾日当午，",
      "answer": "汗滴禾下土。",
      "choices": [
        "汗滴禾下土。",
        "粒粒皆辛苦。",
        "谁知盘中餐。"
      ]
    },
    {
      "id": "q7",
      "form": "next",
      "line": "解落三秋叶，",
      "answer": "能开二月花。",
      "choices": [
        "能开二月花。",
        "过江千尺浪。",
        "入竹万竿斜。"
      ]
    },
    {
      "id": "q8",
      "form": "order",
      "lines": [
        "床前明月光，",
        "疑是地上霜。",
        "举头望明月，",
        "低头思故乡。"
      ],
      "answer": "床前明月光，|疑是地上霜。|举头望明月，|低头思故乡。"
    },
    {
      "id": "q9",
      "form": "order",
      "lines": [
        "鹅，鹅，鹅，",
        "曲项向天歌。",
        "白毛浮绿水，",
        "红掌拨清波。"
      ],
      "answer": "鹅，鹅，鹅，|曲项向天歌。|白毛浮绿水，|红掌拨清波。"
    },
    {
      "id": "q10",
      "form": "order",
      "lines": [
        "远看山有色，",
        "近听水无声。",
        "春去花还在，",
        "人来鸟不惊。"
      ],
      "answer": "远看山有色，|近听水无声。|春去花还在，|人来鸟不惊。"
    }
  ]
};
