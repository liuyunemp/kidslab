export const config = {
  "id": "g1-direction-town",
  "kind": "direction",
  "category": "science",
  "grades": [
    "g1b"
  ],
  "tags": [
    "位置"
  ],
  "icon": "🧭",
  "title": {
    "zh": "方位小镇",
    "en": "Direction Town"
  },
  "description": {
    "zh": "在小镇地图上找前后、左右、上下的位置。",
    "en": "Find neighbors in front, behind, left, right, above and below on a town map."
  },
  "accent": "#328c8b",
  "backdrop": "#e6faf5",
  "mascot": "🧭",
  "tasks": [
    {
      "id": "q1",
      "items": [
        "🐱",
        "🐶",
        "🐰",
        "🐻",
        "🐸",
        "🐼"
      ],
      "anchor": 1,
      "relation": "left",
      "answer": "0",
      "prompt": {
        "zh": "🐶 的左边是谁？",
        "en": "Who is left of 🐶?"
      }
    },
    {
      "id": "q2",
      "items": [
        "🐱",
        "🐶",
        "🐰",
        "🐻",
        "🐸",
        "🐼"
      ],
      "anchor": 1,
      "relation": "right",
      "answer": "2",
      "prompt": {
        "zh": "🐶 的右边是谁？",
        "en": "Who is right of 🐶?"
      }
    },
    {
      "id": "q3",
      "items": [
        "🍎",
        "🍌",
        "🍇",
        "🍊",
        "🍐",
        "🍓"
      ],
      "anchor": 4,
      "relation": "left",
      "answer": "3",
      "prompt": {
        "zh": "🍐 的左边是谁？",
        "en": "Who is left of 🍐?"
      }
    },
    {
      "id": "q4",
      "items": [
        "🍎",
        "🍌",
        "🍇",
        "🍊",
        "🍐",
        "🍓"
      ],
      "anchor": 4,
      "relation": "right",
      "answer": "5",
      "prompt": {
        "zh": "🍐 的右边是谁？",
        "en": "Who is right of 🍐?"
      }
    },
    {
      "id": "q5",
      "items": [
        "🚗",
        "🚌",
        "🚲",
        "🚕",
        "🚎",
        "🚚"
      ],
      "anchor": 3,
      "relation": "front",
      "answer": "0",
      "prompt": {
        "zh": "🚕 的前面是谁？",
        "en": "Who is in front of 🚕?"
      }
    },
    {
      "id": "q6",
      "items": [
        "🚗",
        "🚌",
        "🚲",
        "🚕",
        "🚎",
        "🚚"
      ],
      "anchor": 1,
      "relation": "back",
      "answer": "4",
      "prompt": {
        "zh": "🚌 的后面是谁？",
        "en": "Who is behind 🚌?"
      }
    },
    {
      "id": "q7",
      "items": [
        "🐱",
        "🐶",
        "🐰",
        "🐻",
        "🐸",
        "🐼"
      ],
      "anchor": 4,
      "relation": "above",
      "answer": "1",
      "prompt": {
        "zh": "🐸 的上面是谁？",
        "en": "Who is above 🐸?"
      }
    },
    {
      "id": "q8",
      "items": [
        "🐱",
        "🐶",
        "🐰",
        "🐻",
        "🐸",
        "🐼"
      ],
      "anchor": 1,
      "relation": "below",
      "answer": "4",
      "prompt": {
        "zh": "🐶 的下面是谁？",
        "en": "Who is below 🐶?"
      }
    },
    {
      "id": "q9",
      "items": [
        "🍎",
        "🍌",
        "🍇",
        "🍊",
        "🍐",
        "🍓"
      ],
      "anchor": 3,
      "relation": "front",
      "answer": "0",
      "prompt": {
        "zh": "🍊 的前面是谁？",
        "en": "Who is in front of 🍊?"
      }
    },
    {
      "id": "q10",
      "items": [
        "🚗",
        "🚌",
        "🚲",
        "🚕",
        "🚎",
        "🚚"
      ],
      "anchor": 2,
      "relation": "below",
      "answer": "5",
      "prompt": {
        "zh": "🚲 的下面是谁？",
        "en": "Who is below 🚲?"
      }
    }
  ]
};
