// Owner-authorized fictional chronology for sample photos only; never use as capture metadata.
export const DEMO_COLLECTIONS = [
  {
    id: 'demo-1',
    demoTime: '2024-06-08T13:37:00+08:00',
    files: [
      'web_image_26e8cb.webp',
      'web_image_9dfd90.webp',
      'web_image_f55764.webp',
      'web_image_0f5553.webp',
      'web_image_d044df.webp'
    ],
  },
  {
    id: 'demo-2',
    demoTime: '2024-07-08T21:50:00+08:00',
    files: [
      'web_image_b73257.webp',
      'web_image_2e7a34.webp',
      'web_image_ff2585.webp',
      'web_image_9033dc.webp',
      'web_image_aef9b7.webp'
    ],
  },
  {
    id: 'demo-3',
    demoTime: '2025-09-04T00:08:00+08:00',
    files: [
      'web_image_5f3b7b.webp',
      'web_image_41d948.webp',
      'web_image_912941.webp',
      'web_image_1fcd10.webp',
      'web_image_f98e8e.webp'
    ],
  },
  {
    id: 'demo-4',
    demoTime: '2026-06-19T08:21:00+08:00',
    files: [
      'web_image_7a4d25.webp',
      'web_image_406eb5.webp',
      'web_image_25fa13.webp',
      'web_image_ae5ee6.webp',
      'web_image_35a49f.webp'
    ],
  },
  {
    id: 'demo-5',
    demoTime: '2026-08-01T03:23:00+08:00',
    files: [
      'web_image_ecd686.webp',
      'web_image_ed0b2f.webp',
      'web_image_223d2f.webp',
      'web_image_ce2a91.webp',
      'web_image_12cf77.webp'
    ],
  }
];

export const PHOTO_FILES = DEMO_COLLECTIONS.flatMap(collection => collection.files);
