import { SignDefinition } from '../types';

export const SIGN_DATABASE: SignDefinition[] = [
  // ALPHABET (A - Z)
  {
    id: 'A',
    name: 'Letter A',
    category: 'alphabet',
    description: 'Fist with thumb resting firmly against the side of the index finger.',
    handPosition: 'Held comfortably at mid-chest level, dominant hand upright.',
    orientationTarget: 'camera',
    hints: [
      'Curl all four fingers into the palm',
      'Keep thumb straight resting against the index finger (not folded across)',
      'Palm faces forward directly toward camera'
    ],
    anatomicalTips: 'Do not tuck the thumb inside your fingers. Keep the thumb erect along the outer edge.',
    difficulty: 1,
    fingers: {
      thumb: 'extended',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'B',
    name: 'Letter B',
    category: 'alphabet',
    description: 'Flat open palm with 4 fingers together and thumb folded across the front of the palm.',
    handPosition: 'Upright at chest level, palm straight.',
    orientationTarget: 'camera',
    hints: [
      'Extend all four fingers straight upward, pressed together',
      'Cross your thumb over the base of your palm',
      'CRITICAL: Palm must face directly forward toward the camera, NOT inward'
    ],
    anatomicalTips: 'Ensure your palm plane is parallel to the camera sensor and fingers are pressed together (not spread like 4).',
    difficulty: 1,
    fingers: {
      thumb: 'across',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended'
    }
  },
  {
    id: 'C',
    name: 'Letter C',
    category: 'alphabet',
    description: 'Hand curved into an open "C" shape, thumb and fingers curved toward each other.',
    handPosition: 'Hand held at mid-chest, facing camera.',
    orientationTarget: 'camera',
    hints: [
      'Curve all four fingers and thumb to mimic the letter "C"',
      'Maintain an open arch between thumb tip and index tip',
      'Keep fingers grouped together in the curve'
    ],
    anatomicalTips: 'Imagine holding a round soda can or cup.',
    difficulty: 1,
    fingers: {
      thumb: 'extended',
      index: 'hooked',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'D',
    name: 'Letter D',
    category: 'alphabet',
    description: 'Index finger pointing straight up, thumb touching middle, ring, and pinky forming a circle.',
    handPosition: 'Chest level, vertical index finger.',
    orientationTarget: 'camera',
    hints: [
      'Point your index finger straight up to the ceiling',
      'Touch your thumb to the tips of your middle, ring, and pinky fingers',
      'Palm faces the camera'
    ],
    anatomicalTips: 'Keep the index finger isolated and firm; do not abduct the thumb like L.',
    difficulty: 2,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'E',
    name: 'Letter E',
    category: 'alphabet',
    description: 'All fingertips curled down tightly to touch the thumb tucked beneath.',
    handPosition: 'Upright at chest level.',
    orientationTarget: 'camera',
    hints: [
      'Curl all four fingers downward',
      'Fold the thumb across the palm under the fingertips',
      'Fingertips rest against or just above thumb knuckle'
    ],
    anatomicalTips: 'Keep the hand compact with knuckles facing forward.',
    difficulty: 2,
    fingers: {
      thumb: 'across',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'F',
    name: 'Letter F',
    category: 'alphabet',
    description: 'Index finger and thumb touch to form a ring; middle, ring, and pinky flare straight up.',
    handPosition: 'Upright at chest height.',
    orientationTarget: 'camera',
    hints: [
      'Touch tip of index finger to tip of thumb',
      'Extend middle, ring, and pinky fingers straight upward',
      'Spread the three upper fingers slightly'
    ],
    anatomicalTips: 'Form a clean circle between index and thumb. Three outer fingers stand tall.',
    difficulty: 2,
    fingers: {
      thumb: 'curled',
      index: 'curled',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended'
    }
  },
  {
    id: 'G',
    name: 'Letter G',
    category: 'alphabet',
    description: 'Index finger and thumb extended horizontally parallel to each other, pointing sideways.',
    handPosition: 'Chest level, hand rotated sideways.',
    orientationTarget: 'side',
    hints: [
      'Point your index finger horizontally across your chest',
      'Extend your thumb parallel to the index finger',
      'Curl middle, ring, and pinky into your palm'
    ],
    anatomicalTips: 'Palm faces towards you / sideways, not straight at the camera.',
    difficulty: 2,
    fingers: {
      thumb: 'extended',
      index: 'extended',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'H',
    name: 'Letter H',
    category: 'alphabet',
    description: 'Index and middle fingers extended together horizontally pointing sideways.',
    handPosition: 'Chest level, horizontal hand.',
    orientationTarget: 'side',
    hints: [
      'Extend both index and middle fingers horizontally',
      'Keep index and middle pressed tightly together',
      'Curl ring and pinky into palm; thumb tucks against ring finger'
    ],
    anatomicalTips: 'Like G, but with two fingers extended horizontally together.',
    difficulty: 2,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'I',
    name: 'Letter I',
    category: 'alphabet',
    description: 'Pinky extended straight up, other three fingers curled with thumb crossed over them.',
    handPosition: 'Chest level, vertical pinky finger.',
    orientationTarget: 'camera',
    hints: [
      'Extend pinky finger straight up to the ceiling',
      'Tightly curl index, middle, and ring fingers into the palm',
      'Fold thumb across the curled fingers'
    ],
    anatomicalTips: 'Keep the pinky upright and palm facing the camera.',
    difficulty: 1,
    fingers: {
      thumb: 'across',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'extended'
    }
  },
  {
    id: 'J',
    name: 'Letter J',
    category: 'alphabet',
    description: 'Motion Letter: Pinky extended, tracing a "J" curved hook in the air.',
    handPosition: 'Chest level, starting with "I" pose then drawing a hook downward and curving up.',
    orientationTarget: 'camera',
    hints: [
      'Hold pinky up like letter I',
      'Move your hand downward smoothly',
      'Hook the pinky inward and upward, drawing the letter J'
    ],
    anatomicalTips: 'Motion-dependent sign! Complete the full swooping hook stroke.',
    difficulty: 3,
    isMotionSign: true,
    motionType: 'trace_j',
    fingers: {
      thumb: 'across',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'extended'
    }
  },
  {
    id: 'K',
    name: 'Letter K',
    category: 'alphabet',
    description: 'Index upright, middle extended slightly forward, thumb upright touching the middle finger knuckle.',
    handPosition: 'Chest level, palm facing forward.',
    orientationTarget: 'camera',
    hints: [
      'Point index finger straight up',
      'Point middle finger forward at about a 45 degree angle',
      'Place thumb tip against the side of the middle finger'
    ],
    anatomicalTips: 'Viewed from the side, thumb and middle finger form a V shape.',
    difficulty: 3,
    fingers: {
      thumb: 'extended',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'L',
    name: 'Letter L',
    category: 'alphabet',
    description: 'Thumb and index finger held at 90 degrees forming an "L" shape.',
    handPosition: 'Chest height, palm facing camera.',
    orientationTarget: 'camera',
    hints: [
      'Extend index finger upward',
      'Extend thumb outward horizontally at a right angle',
      'Curl middle, ring, and pinky firmly into the palm'
    ],
    anatomicalTips: 'Ensure the angle between thumb and index is a crisp 90 degrees.',
    difficulty: 1,
    fingers: {
      thumb: 'abducted',
      index: 'extended',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'M',
    name: 'Letter M',
    category: 'alphabet',
    description: 'Three fingers (index, middle, ring) folded over the thumb so thumb peeks out between ring and pinky.',
    handPosition: 'Chest level, compact downward fist.',
    orientationTarget: 'camera',
    hints: [
      'Tuck thumb under index, middle, and ring fingers',
      'Fold the three fingers down over the thumb',
      'Only the pinky is folded to the palm without thumb underneath'
    ],
    anatomicalTips: 'Three knuckles show across the top of the folded thumb.',
    difficulty: 2,
    fingers: {
      thumb: 'across',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'N',
    name: 'Letter N',
    category: 'alphabet',
    description: 'Two fingers (index and middle) folded over the thumb so thumb peeks out between middle and ring.',
    handPosition: 'Chest level, compact downward fist.',
    orientationTarget: 'camera',
    hints: [
      'Tuck thumb under index and middle fingers',
      'Fold index and middle down over the thumb',
      'Ring and pinky curled directly against palm'
    ],
    anatomicalTips: 'Two knuckles show over the thumb, distinguishing from M (3) and T (1).',
    difficulty: 2,
    fingers: {
      thumb: 'across',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'O',
    name: 'Letter O',
    category: 'alphabet',
    description: 'All fingertips curved down to touch the thumb tip, forming a circular "O".',
    handPosition: 'Chest level, rounded hand facing camera.',
    orientationTarget: 'camera',
    hints: [
      'Curve all four fingers and thumb into a circle',
      'Tips of index, middle, ring, and pinky touch the thumb tip',
      'Keep palm oriented forward so the hole of the O is visible'
    ],
    anatomicalTips: 'Unlike C which is an open crescent, O has fingertip-to-thumb contact.',
    difficulty: 1,
    fingers: {
      thumb: 'curled',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'P',
    name: 'Letter P',
    category: 'alphabet',
    description: 'Letter K handshape tilted downward with index finger pointing down.',
    handPosition: 'Chest level, wrist tilted downward.',
    orientationTarget: 'down',
    hints: [
      'Form the K handshape (index up, middle 45 degrees, thumb on middle knuckle)',
      'Point your hand downward from the wrist',
      'Index finger points toward the floor'
    ],
    anatomicalTips: 'Anatomically identical handshape to K, but with wrist inverted downward.',
    difficulty: 3,
    fingers: {
      thumb: 'extended',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'Q',
    name: 'Letter Q',
    category: 'alphabet',
    description: 'Letter G handshape tilted downward with index and thumb pointing toward the floor.',
    handPosition: 'Chest level, pointing down.',
    orientationTarget: 'down',
    hints: [
      'Form the G handshape (index and thumb parallel)',
      'Rotate wrist so index and thumb point straight downward',
      'Keep middle, ring, and pinky curled into palm'
    ],
    anatomicalTips: 'Downward-pointing variant of G.',
    difficulty: 2,
    fingers: {
      thumb: 'extended',
      index: 'extended',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'R',
    name: 'Letter R',
    category: 'alphabet',
    description: 'Index and middle fingers extended upward and crossed over each other.',
    handPosition: 'Chest level, vertical fingers crossed.',
    orientationTarget: 'camera',
    hints: [
      'Extend index and middle fingers upward',
      'Cross middle finger over the front of the index finger',
      'Curl ring and pinky into palm with thumb over them'
    ],
    anatomicalTips: 'The classic "fingers crossed" good luck gesture.',
    difficulty: 2,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'S',
    name: 'Letter S',
    category: 'alphabet',
    description: 'Tight fist with thumb folded across the front of all four fingers.',
    handPosition: 'Chest level, fist facing camera.',
    orientationTarget: 'camera',
    hints: [
      'Make a firm fist with all four fingers curled tightly into the palm',
      'Wrap your thumb directly across the front of the curled fingers',
      'Palm/knuckles face directly forward toward the camera'
    ],
    anatomicalTips: 'In A, thumb is on the side. In S, thumb crosses the front.',
    difficulty: 1,
    fingers: {
      thumb: 'across',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'T',
    name: 'Letter T',
    category: 'alphabet',
    description: 'Thumb tucked under index finger so thumb tip peeks out between index and middle knuckles.',
    handPosition: 'Chest level, compact fist.',
    orientationTarget: 'camera',
    hints: [
      'Insert thumb between index and middle fingers',
      'Curl index finger over the top of the thumb',
      'Curl middle, ring, and pinky into the palm'
    ],
    anatomicalTips: 'One knuckle over the thumb. Contrast with N (2) and M (3).',
    difficulty: 2,
    fingers: {
      thumb: 'across',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'U',
    name: 'Letter U',
    category: 'alphabet',
    description: 'Index and middle fingers extended straight up and pressed together.',
    handPosition: 'Chest level, vertical digits.',
    orientationTarget: 'camera',
    hints: [
      'Extend index and middle fingers straight up',
      'Press them tightly together side by side (no gap)',
      'Fold ring and pinky into palm with thumb resting over them'
    ],
    anatomicalTips: 'Pressed together (U) vs spread apart in a V (V).',
    difficulty: 1,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'V',
    name: 'Letter V',
    category: 'alphabet',
    description: 'Index and middle fingers spread in a "V" shape; other fingers curled.',
    handPosition: 'Chest level, upright fingers.',
    orientationTarget: 'camera',
    hints: [
      'Extend index and middle fingers straight up',
      'Separate them into a distinct V shape',
      'Hold thumb over folded ring and pinky fingers'
    ],
    anatomicalTips: 'Keep palm facing forward with fingers spread.',
    difficulty: 1,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'W',
    name: 'Letter W',
    category: 'alphabet',
    description: 'Three fingers (index, middle, ring) held upright and spread; thumb holds pinky.',
    handPosition: 'Chest level, palm forward.',
    orientationTarget: 'camera',
    hints: [
      'Extend index, middle, and ring fingers upward',
      'Spread them evenly',
      'Thumb secures pinky against the palm'
    ],
    anatomicalTips: 'Three fingers standing tall and spread.',
    difficulty: 2,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'curled'
    }
  },
  {
    id: 'X',
    name: 'Letter X',
    category: 'alphabet',
    description: 'Index finger hooked/crooked like a pirate hook; other fingers curled.',
    handPosition: 'Chest level, hook facing camera.',
    orientationTarget: 'camera',
    hints: [
      'Extend index finger and bend its first two joints into a hook',
      'Curl middle, ring, and pinky fingers tightly into palm',
      'Tuck thumb against the middle finger'
    ],
    anatomicalTips: 'Index PIP joint is bent ~90 degrees like a hook.',
    difficulty: 2,
    fingers: {
      thumb: 'curled',
      index: 'hooked',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'Y',
    name: 'Letter Y',
    category: 'alphabet',
    description: 'Thumb and pinky extended outward; index, middle, and ring curled.',
    handPosition: 'Mid-chest, palm forward.',
    orientationTarget: 'camera',
    hints: [
      'Stick thumb and pinky straight out to the sides',
      'Tightly curl middle three fingers',
      'Resembles a phone receiver or shaka'
    ],
    anatomicalTips: 'Keep wrist upright and palm facing forward.',
    difficulty: 1,
    fingers: {
      thumb: 'abducted',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'extended'
    }
  },
  {
    id: 'Z',
    name: 'Letter Z',
    category: 'alphabet',
    description: 'Motion Letter: Index finger extended, tracing a "Z" zigzag in the air.',
    handPosition: 'Chest level, index pointing forward/upward, drawing 3 strokes: right, diagonal down-left, right.',
    orientationTarget: 'camera',
    hints: [
      'Extend index finger like the number 1',
      'Draw a horizontal stroke to the right',
      'Draw a diagonal stroke down and to the left',
      'Draw a final horizontal stroke to the right'
    ],
    anatomicalTips: 'Motion-dependent sign! Complete the full 3-stroke zigzag in the air.',
    difficulty: 3,
    isMotionSign: true,
    motionType: 'trace_z',
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },

  // NUMBERS
  {
    id: '1',
    name: 'Number 1',
    category: 'numbers',
    description: 'Index finger pointing straight up, palm facing inward/forward, other fingers folded.',
    handPosition: 'Chest level, single vertical digit.',
    orientationTarget: 'camera',
    hints: [
      'Point index finger straight up',
      'Fold other three fingers into palm with thumb over them',
      'Keep palm facing the camera'
    ],
    anatomicalTips: 'Do not bend the index finger.',
    difficulty: 1,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: '2',
    name: 'Number 2',
    category: 'numbers',
    description: 'Index and middle fingers held upright together or slightly spread.',
    handPosition: 'Chest height.',
    orientationTarget: 'camera',
    hints: [
      'Extend index and middle fingers',
      'Keep thumb holding down ring and pinky',
      'Palm faces forward'
    ],
    anatomicalTips: 'Keep the two fingers tall and straight.',
    difficulty: 1,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: '3',
    name: 'Number 3',
    category: 'numbers',
    description: 'Thumb, index, and middle fingers extended; ring and pinky curled.',
    handPosition: 'Chest height, palm forward.',
    orientationTarget: 'camera',
    hints: [
      'Extend thumb, index, and middle fingers',
      'Curl ring and pinky fingers',
      'Palm facing forward'
    ],
    anatomicalTips: 'Note that in ASL 3 includes the thumb, unlike British or traditional counting.',
    difficulty: 2,
    fingers: {
      thumb: 'abducted',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: '4',
    name: 'Number 4',
    category: 'numbers',
    description: 'Four fingers upright and spread, thumb tucked across the palm.',
    handPosition: 'Chest level, palm forward.',
    orientationTarget: 'camera',
    hints: [
      'Extend index, middle, ring, and pinky straight up',
      'Fold thumb across palm',
      'Keep palm facing the camera'
    ],
    anatomicalTips: 'Keep all four fingers spaced evenly.',
    difficulty: 1,
    fingers: {
      thumb: 'across',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended'
    }
  },
  {
    id: '5',
    name: 'Number 5',
    category: 'numbers',
    description: 'All five fingers fully extended and spread wide (open hand).',
    handPosition: 'Mid-chest, high visibility.',
    orientationTarget: 'camera',
    hints: [
      'Open hand completely',
      'Spread all five fingers apart',
      'Palm faces directly forward'
    ],
    anatomicalTips: 'Relax the tension while keeping all fingers visibly extended.',
    difficulty: 1,
    fingers: {
      thumb: 'extended',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended'
    }
  },

  // COMMON EVERYDAY SIGNS
  {
    id: 'HELLO',
    name: 'Hello',
    category: 'common',
    description: 'Open flat hand near temple moving outward in a friendly salute greeting.',
    handPosition: 'Start near eyebrow/temple, move gently outward.',
    orientationTarget: 'camera',
    hints: [
      'Hold open hand (B shape) with fingers together',
      'Touch edge of hand near temple/forehead',
      'Move hand outward and forward with palm facing viewer'
    ],
    anatomicalTips: 'Keep the movement crisp and friendly. Palm remains directed outward.',
    difficulty: 1,
    fingers: {
      thumb: 'across',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended'
    }
  },
  {
    id: 'THANK YOU',
    name: 'Thank You',
    category: 'common',
    description: 'Fingertips touch the chin/lips and move forward toward the other person.',
    handPosition: 'Starts at chin/lips, travels outward.',
    orientationTarget: 'camera',
    hints: [
      'Place fingertips of flat open hand on your chin',
      'Move hand smoothly forward and slightly down toward the other person',
      'Palm ends up facing slightly up and forward'
    ],
    anatomicalTips: 'A sign of gratitude and respect. Do not blow a kiss; keep hand flat and move directly forward.',
    difficulty: 1,
    fingers: {
      thumb: 'extended',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended'
    }
  },
  {
    id: 'PLEASE',
    name: 'Please',
    category: 'common',
    description: 'Flat open hand placed on center of chest, making gentle clockwise circular motion.',
    handPosition: 'Center of chest, flat palm.',
    orientationTarget: 'inward',
    hints: [
      'Open flat hand with fingers together',
      'Place palm against your upper chest',
      'Rub in small clockwise circles'
    ],
    anatomicalTips: 'Palm rests lightly against the chest during the circular rub.',
    difficulty: 2,
    fingers: {
      thumb: 'extended',
      index: 'extended',
      middle: 'extended',
      ring: 'extended',
      pinky: 'extended'
    }
  },
  {
    id: 'YES',
    name: 'Yes',
    category: 'common',
    description: 'Fist nodding up and down from the wrist, like a nodding head.',
    handPosition: 'Chest level, closed fist.',
    orientationTarget: 'camera',
    hints: [
      'Make an "S" fist (thumb over curled fingers)',
      'Hold fist upright in front of you',
      'Bend wrist to nod the fist down and up twice'
    ],
    anatomicalTips: 'The movement mimics a nodding head affirming a statement.',
    difficulty: 1,
    fingers: {
      thumb: 'across',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'NO',
    name: 'No',
    category: 'common',
    description: 'Index and middle fingers snap together against the thumb, like a firm mouth closing.',
    handPosition: 'Chest level, snappy closure.',
    orientationTarget: 'camera',
    hints: [
      'Extend index and middle fingers slightly separated',
      'Snap tips down quickly to touch the tip of the thumb',
      'Ring and pinky stay curled into palm'
    ],
    anatomicalTips: 'Keep the snap firm and definite, like closing a beak or mouth.',
    difficulty: 2,
    fingers: {
      thumb: 'extended',
      index: 'hooked',
      middle: 'hooked',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'SORRY',
    name: 'Sorry',
    category: 'common',
    description: '"A" fist placed over the heart, rubbing in a gentle circular motion.',
    handPosition: 'Center of chest over heart.',
    orientationTarget: 'inward',
    hints: [
      'Make an "A" fist (thumb resting against index)',
      'Place knuckle side against your chest over heart',
      'Rub in small respectful circles'
    ],
    anatomicalTips: 'Conveys genuine apology and heartfelt empathy.',
    difficulty: 2,
    fingers: {
      thumb: 'extended',
      index: 'curled',
      middle: 'curled',
      ring: 'curled',
      pinky: 'curled'
    }
  },
  {
    id: 'LOVE',
    name: 'I Love You (ILY)',
    category: 'common',
    description: 'ASL ILY sign: Thumb, index finger, and pinky extended; middle and ring folded.',
    handPosition: 'Chest or raised height, iconic universal sign.',
    orientationTarget: 'camera',
    hints: [
      'Extend thumb, index, and pinky fingers',
      'Fold down middle and ring fingers',
      'Palm faces forward proudly'
    ],
    anatomicalTips: 'Combines the handshapes of letters I, L, and Y into one cherished gesture.',
    difficulty: 1,
    fingers: {
      thumb: 'abducted',
      index: 'extended',
      middle: 'curled',
      ring: 'curled',
      pinky: 'extended'
    }
  },
  {
    id: 'PEACE',
    name: 'Peace',
    category: 'common',
    description: 'Victory / peace sign held high with index and middle fingers spread.',
    handPosition: 'Chest to eye level.',
    orientationTarget: 'camera',
    hints: [
      'Extend index and middle fingers in a proud "V"',
      'Hold ring and pinky down with thumb',
      'Palm facing outward'
    ],
    anatomicalTips: 'A welcoming, universal gesture of goodwill.',
    difficulty: 1,
    fingers: {
      thumb: 'curled',
      index: 'extended',
      middle: 'extended',
      ring: 'curled',
      pinky: 'curled'
    }
  }
];

export const GET_SIGN_BY_ID = (id: string): SignDefinition => {
  const found = SIGN_DATABASE.find(s => s.id.toLowerCase() === id.toLowerCase());
  return found || SIGN_DATABASE[0];
};
