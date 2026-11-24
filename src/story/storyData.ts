// Pure TypeScript Story Graph & Fallback Data (HR-1: No React, Three.js, or DOM dependencies)

import type { StoryNode } from './storyState';

export const STORY_NODES: Record<string, StoryNode> = {
  // ==========================================
  // ACT I: AWAKENING & THE FORGOTTEN CLOCK
  // ==========================================
  n_intro: {
    id: 'n_intro',
    act: 1,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'You awaken beneath a sky veiled in twilight. The world of Emotionverse is fading; the primordial light is slipping away into the void.',
        'Before you lies the remnants of an ancient sanctuary. You are the last keeper, guided only by the emotion burning in your chest.',
        'How will you take your first step into this dying realm?'
      ],
      hintLadder: [
        'Look around your immediate surroundings.',
        'The path ahead leads toward the ancient stone ruins.',
        'Approach the stone platform ahead to locate the Forgotten Clock.'
      ]
    },
    choices: [
      {
        id: 'c_intro_faith',
        label: 'Step forward with steadfast faith in tomorrow',
        effects: { resolve: 1 },
        next: 'n_clock'
      },
      {
        id: 'c_intro_curious',
        label: 'Gaze into the swirling twilight runes above',
        effects: { memory: 1 },
        next: 'n_clock'
      },
      {
        id: 'c_intro_cautious',
        label: 'Proceed cautiously, listening for echoes in the shadows',
        gate: (vars, _flags, emotion) => emotion === 'fear' || vars.resolve >= 1,
        effects: { resolve: 0 },
        next: 'n_clock'
      },
      {
        id: 'c_intro_mourn',
        label: 'Touch the cold earth and mourn the world that was',
        gate: (_vars, _flags, emotion) => emotion === 'sadness',
        effects: { resolve: 0, memory: 1 },
        next: 'n_clock'
      }
    ]
  },

  n_clock: {
    id: 'n_clock',
    act: 1,
    speaker: 'clock',
    fallback: {
      dialogue: [
        'An immense brass dial rests embedded in the stone altar. It is the Forgotten Clock, its pendulum frozen mid-swing in a web of crystalline frost.',
        'A faint pulse vibrates through its mainspring — the heart of the first age waiting for a hand to turn it.'
      ],
      hintLadder: [
        'Examine the mechanical pendulum and mainspring.',
        'Winding the clock may restore the flow of time and light to this region.',
        'Choose whether to wind the clock, leave it resting, or break its mechanism.'
      ]
    },
    choices: [
      {
        id: 'c_clock_wind',
        label: 'Wind the ancient gears to reignite time',
        effects: { resolve: 2, light: 1 },
        setFlags: { clockWound: true },
        envReaction: 'CLOCK_WOUND_LIGHT',
        next: 'n_clock_echo_wind'
      },
      {
        id: 'c_clock_leave',
        label: 'Leave the clock undisturbed; time has rested long enough',
        effects: { resolve: -1 },
        next: 'n_clock_echo_leave'
      },
      {
        id: 'c_clock_break',
        label: 'Shatter the rusted pendulum to end its futile vigil',
        effects: { resolve: -3 },
        setFlags: { clockBroken: true },
        next: 'n_clock_echo_break'
      },
      {
        id: 'c_clock_study',
        label: 'Decipher the astronomical glyphs etched into the bezel',
        gate: (_vars, _flags, emotion) => emotion === 'curiosity',
        effects: { memory: 1, resolve: 1 },
        next: 'n_clock_echo_study'
      }
    ]
  },

  n_clock_echo_wind: {
    id: 'n_clock_echo_wind',
    act: 1,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'With a deep resonance, the escapement catches. Brass wheels turn, grinding away centuries of rime.',
        'A wave of golden luminescence radiates outward from the dais, lifting the shadows and warming the cold ground beneath your boots.'
      ],
      hintLadder: [
        'The clock has resumed ticking.',
        'Listen to the consequence of your choice.',
        'Continue your path toward the living gardens.'
      ]
    },
    choices: [
      {
        id: 'c_clock_wind_cont',
        label: 'Watch the light disperse into the horizon',
        next: 'n_clock_after'
      }
    ]
  },

  n_clock_echo_leave: {
    id: 'n_clock_echo_leave',
    act: 1,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'You pull your hands back. The brass pendulum stays still, locked in its century-long slumber.',
        'The world remains in quiet twilight, patient and fading.'
      ],
      hintLadder: [
        'The clock remains still.',
        'Reflect on your restraint.',
        'Proceed into the deeper grove.'
      ]
    },
    choices: [
      {
        id: 'c_clock_leave_cont',
        label: 'Turn away toward the shadowed groves',
        next: 'n_clock_after'
      }
    ]
  },

  n_clock_echo_break: {
    id: 'n_clock_echo_break',
    act: 1,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'With a sharp crack, the ancient pendulum snaps. Shards of aged brass chime hollowly against the stones.',
        'A chilling gust blows through the chamber; whatever heartbeat remained here has been severed.'
      ],
      hintLadder: [
        'The mechanism is broken.',
        'Feel the consequence of destruction.',
        'Press forward into the gathering dark.'
      ]
    },
    choices: [
      {
        id: 'c_clock_break_cont',
        label: 'Step past the silent fragments',
        next: 'n_clock_after'
      }
    ]
  },

  n_clock_echo_study: {
    id: 'n_clock_echo_study',
    act: 1,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'Your fingers trace the spiraling constellations on the dial. You perceive the secret: the clock was not built to measure hours, but keepers’ memories.',
        'The knowledge settles into your spirit like a lantern in the mist.'
      ],
      hintLadder: [
        'Ancient memories have been recalled.',
        'The clockwork holds hidden lore.',
        'Continue with this newfound insight.'
      ]
    },
    choices: [
      {
        id: 'c_clock_study_wind',
        label: 'With understanding in your heart, wind the gears',
        effects: { light: 1, resolve: 1 },
        setFlags: { clockWound: true },
        envReaction: 'CLOCK_WOUND_LIGHT',
        next: 'n_clock_after'
      },
      {
        id: 'c_clock_study_cont',
        label: 'Keep the secret and move onward',
        next: 'n_clock_after'
      }
    ]
  },

  n_clock_after: {
    id: 'n_clock_after',
    act: 1,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'The first trial is concluded. Beyond the sanctuary arches, the air stirs with anticipation.',
        'A path lined with luminous flora and whispering branches opens toward the inner sanctum.'
      ],
      hintLadder: [
        'The first act is drawing to a close.',
        'Follow the glowing petal trail.',
        'Step across the threshold into Act II.'
      ]
    },
    choices: [
      {
        id: 'c_clock_after_cont',
        label: 'Proceed into the living heart of the grove',
        next: 'n_midpoint'
      }
    ]
  },

  n_midpoint: {
    id: 'n_midpoint',
    act: 2,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'The canopy deepens. Here, the boundary between memory and reality softens like morning fog.',
        'Upon a pedestal carved from petrified wood rests a tome whose leaves rustle as if caressed by an invisible breeze.'
      ],
      hintLadder: [
        'You have entered Act II: The Living Memory.',
        'Approach the rustling tome ahead.',
        'Interact with the Living Book on the wooden pedestal.'
      ]
    },
    choices: [
      {
        id: 'c_midpoint_cont',
        label: 'Approach the pedestal and greet the Living Book',
        envReaction: 'ACT_2',
        next: 'n_book'
      }
    ]
  },

  // ==========================================
  // ACT II: THE LIVING BOOK & MEMORY
  // ==========================================
  n_book: {
    id: 'n_book',
    act: 2,
    speaker: 'book',
    fallback: {
      dialogue: [
        '“Traveler...” a voice whispers from the parchment pages, “I hold the grief and triumphs of all keepers who came before you.”',
        '“Will you offer your warmth to remember with me, or will you guard your heart from our sorrow?”'
      ],
      hintLadder: [
        'The Living Book responds to vulnerability and trust.',
        'Trusting the book unlocks ancient memories required for higher wisdom.',
        'Select how you will engage with the living pages.'
      ]
    },
    choices: [
      {
        id: 'c_book_trust',
        label: 'Open your heart and trust the memories within',
        effects: { memory: 2 },
        setFlags: { bookTrusted: true },
        envReaction: 'BOOK_TRUSTED_BLOOM',
        next: 'n_book_echo_trust'
      },
      {
        id: 'c_book_reject',
        label: 'Close the tome firmly; the past cannot save the dying present',
        effects: { memory: -2 },
        next: 'n_book_echo_reject'
      },
      {
        id: 'c_book_partial',
        label: 'Read only the historical records, keeping emotion detached',
        effects: { memory: 1 },
        next: 'n_book_echo_partial'
      },
      {
        id: 'c_book_hope_comfort',
        label: 'Offer words of hope to soothe the weeping pages',
        gate: (_vars, _flags, emotion) => emotion === 'hope',
        effects: { memory: 2, resolve: 1 },
        setFlags: { bookTrusted: true },
        envReaction: 'BOOK_TRUSTED_BLOOM',
        next: 'n_book_echo_trust'
      },
      {
        id: 'c_book_sadness_share',
        label: 'Weep alongside the book, sharing the ache of forgotten lives',
        gate: (_vars, _flags, emotion) => emotion === 'sadness',
        effects: { memory: 2, light: 1 },
        setFlags: { bookTrusted: true },
        envReaction: 'BOOK_TRUSTED_BLOOM',
        next: 'n_book_echo_trust'
      }
    ]
  },

  n_book_echo_trust: {
    id: 'n_book_echo_trust',
    act: 2,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'As your palm meets the paper, emerald ink cascades across the pages. Forgotten laughter and ancient songs surge into your consciousness.',
        'Beneath your feet, vibrant blossoms suddenly unfurl, their petals releasing a soothing fragrance that fills the glade.'
      ],
      hintLadder: [
        'The grove has responded to your trust with blooming flowers.',
        'Ponder the keeper’s legacy you have embraced.',
        'Follow the path toward the crystal sanctum.'
      ]
    },
    choices: [
      {
        id: 'c_book_trust_cont',
        label: 'Carry the legacy forward',
        next: 'n_book_after'
      }
    ]
  },

  n_book_echo_reject: {
    id: 'n_book_echo_reject',
    act: 2,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'The heavy leather cover slams shut. The gentle rustle ceases, replaced by a brooding, hollow silence.',
        'The blossoms around the pedestal wither slightly, their colors dimming in disappointment.'
      ],
      hintLadder: [
        'The book is sealed in silence.',
        'You have chosen detachment.',
        'Continue toward the final threshold.'
      ]
    },
    choices: [
      {
        id: 'c_book_reject_cont',
        label: 'Press onward without looking back',
        next: 'n_book_after'
      }
    ]
  },

  n_book_echo_partial: {
    id: 'n_book_echo_partial',
    act: 2,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'You skim the dates, the names, the architectural schematics. You learn facts of the world, yet the living pulse remains distant.',
        'A modest glow settles over the pedestal as you absorb the pragmatic truth.'
      ],
      hintLadder: [
        'You gathered historical knowledge without vulnerability.',
        'Consider how facts alone weigh against emotion.',
        'Proceed into Act III.'
      ]
    },
    choices: [
      {
        id: 'c_book_partial_cont',
        label: 'Pocket the notes and move forward',
        next: 'n_book_after'
      }
    ]
  },

  n_book_after: {
    id: 'n_book_after',
    act: 2,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'The second trial has etched its mark upon your soul. Ahead, the forest gives way to towering crystal spires.',
        'The air grows thin and vibrant with hums of concentrated energy.'
      ],
      hintLadder: [
        'You stand at the edge of the final act.',
        'Approach the crystal sanctuary at the heart of the realm.',
        'Cross into the final crossing.'
      ]
    },
    choices: [
      {
        id: 'c_book_after_cont',
        label: 'Cross the threshold toward the Last Crystal',
        next: 'n_crossing'
      }
    ]
  },

  n_crossing: {
    id: 'n_crossing',
    act: 3,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'The sky overhead has narrowed to a vortex of starlight and shadow. The fading of Emotionverse reaches its zenith.',
        'Before you rises the Dais of Destiny. Suspended within a prism of pure force hovers the Last Crystal.'
      ],
      hintLadder: [
        'Act III: The Last Sanctuary has begun.',
        'The Last Crystal holds the remaining soul of this universe.',
        'Step onto the dais to face your destiny.'
      ]
    },
    choices: [
      {
        id: 'c_crossing_cont',
        label: 'Ascend the dais to the crystal',
        envReaction: 'ACT_3',
        next: 'n_crystal_intro'
      }
    ]
  },

  // ==========================================
  // ACT III: THE LAST CRYSTAL & DESTINY
  // ==========================================
  n_crystal_intro: {
    id: 'n_crystal_intro',
    act: 3,
    speaker: 'crystal',
    fallback: {
      dialogue: [
        '“Keeper,” the crystal speaks in harmonic tones that vibrate directly inside your mind.',
        '“Every choice you made, every emotion you held, has brought you to this singular nexus. The world can no longer remain as it was.”',
        '“What will become of the last light?”'
      ],
      hintLadder: [
        'The final decision is before you.',
        'Prior choices, flags, and variables determine available options.',
        'Approach the core to decide the fate of Emotionverse.'
      ]
    },
    choices: [
      {
        id: 'c_crystal_intro_cont',
        label: 'Reach out toward the pulsing facet',
        next: 'n_crystal'
      }
    ]
  },

  n_crystal: {
    id: 'n_crystal',
    act: 3,
    speaker: 'crystal',
    fallback: {
      dialogue: [
        'The crystal’s facets glow with shifting hues: gold of past dawns, cyan of dreams unborn, and the quiet violet of ending.',
        'The decision lies solely in your hands.'
      ],
      hintLadder: [
        'Sharing the crystal leads to TRANSFORMATION.',
        'Sacrificing yourself requires deep memory (>=2) and clock wound, leading to RESTORATION.',
        'Hoarding or shattering the light yields DARKNESS.'
      ]
    },
    choices: [
      {
        id: 'c_crystal_share',
        label: 'Share the crystal freely with the cosmos, transforming the world into something new',
        effects: { light: 2 },
        setFlags: { crystalShared: true },
        envReaction: 'CRYSTAL_SHARED_BLOOM',
        next: 'n_end_transform'
      },
      {
        id: 'c_crystal_sacrifice',
        label: 'Weave your own soul into the crystal, restoring the ancient order',
        gate: (vars, _flags) => vars.memory >= 2,
        effects: { light: 2, resolve: 2 },
        // Does NOT set crystalShared; together with light>=3 and clockWound, triggers RESTORATION
        envReaction: 'ENDING_RESTORE',
        next: 'n_end_restore'
      },
      {
        id: 'c_crystal_keep',
        label: 'Clutch the crystal for yourself; let the rest of the world fade into peace',
        effects: { resolve: -1 },
        envReaction: 'ENDING_DARK',
        next: 'n_end_dark'
      },
      {
        id: 'c_crystal_shatter',
        label: 'Shatter the crystal completely, letting the void claim all',
        gate: (vars) => vars.resolve <= 0,
        effects: { resolve: -5, light: -3 },
        envReaction: 'ENDING_DARK',
        next: 'n_end_dark'
      },
      {
        id: 'c_crystal_hymn',
        label: 'Sing the Ancient Keeper’s Hymn to attune the harmonic frequencies',
        gate: (vars, _flags, emotion) => emotion === 'curiosity' || vars.memory >= 1,
        effects: { light: 1, resolve: 1 },
        next: 'n_crystal_echo_hymn'
      }
    ]
  },

  n_crystal_echo_hymn: {
    id: 'n_crystal_echo_hymn',
    act: 3,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'Your voice carries across the starry void. The crystal responds in resonant unison, illuminating unseen celestial geometries.',
        'The clarity of all ages settles around you. The final path is crystal clear.'
      ],
      hintLadder: [
        'The crystal is harmonized.',
        'Your attunement has elevated the final moment.',
        'Make your ultimate choice.'
      ]
    },
    choices: [
      {
        id: 'c_hymn_return',
        label: 'Seal the fate of Emotionverse',
        next: 'n_crystal'
      }
    ]
  },

  // ==========================================
  // ENDINGS (TERMINAL NODES)
  // ==========================================
  n_end_restore: {
    id: 'n_end_restore',
    act: 3,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'RESTORATION: The ancient light rushes back into the world like a tidal wave of golden dawn.',
        'The clock chimes throughout the valleys, ancient towers rebuild themselves from dust, and the realm is returned to its glorious, timeless peace.',
        'You gave your all, and the world lives on in your honor.'
      ],
      hintLadder: [
        'The Restoration ending has been achieved.',
        'Reflect upon the revived world.',
        'Use the restart option to experience a new path.'
      ]
    },
    choices: []
  },

  n_end_transform: {
    id: 'n_end_transform',
    act: 3,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'TRANSFORMATION: The crystal shatters into millions of luminescent spores that drift across the continents.',
        'The old laws of the world dissolve; in their place blooms an ethereal ecosystem of emerald and cyan radiance.',
        'Emotionverse has not been saved as it was — it has evolved into something magnificent and unforeseen.'
      ],
      hintLadder: [
        'The Transformation ending has been achieved.',
        'Witness the birth of a new realm.',
        'Use the restart option to explore other destinies.'
      ]
    },
    choices: []
  },

  n_end_dark: {
    id: 'n_end_dark',
    act: 3,
    speaker: 'narrator',
    fallback: {
      dialogue: [
        'DARKNESS: The final ember of light gently winks out. Shadows stretch across the hills, soothing the weary land into deep, dreamless slumber.',
        'There is no pain, only the profound quiet of an endless cosmic night under the stars.',
        'The story of the last keeper has ended.'
      ],
      hintLadder: [
        'The Darkness ending has been reached.',
        'Contemplate the peaceful silence of the void.',
        'Use the restart option to awaken the world anew.'
      ]
    },
    choices: []
  }
};
