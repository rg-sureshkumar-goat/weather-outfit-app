// Names the review screen shows for each avatar choice (R24, R40, R43), in
// the order the spec lists them. The keys match the art's option keys.

export const GENDER_NAMES = { woman: 'Female', man: 'Male' };

export const BODY_TYPE_NAMES = {
  slim: 'Slim',
  average: 'Average',
  athletic: 'Athletic',
  hourglass: 'Hourglass',
  pear: 'Pear',
  broad: 'Broad',
  stocky: 'Stocky',
  plusSize: 'Plus-size',
};

export const HAIRSTYLE_NAMES = {
  bald: 'Bald',
  buzz: 'Buzz',
  shortCrop: 'Short crop',
  shortCurls: 'Short curls or coils',
  afro: 'Afro',
  mediumStraight: 'Medium straight',
  mediumCurly: 'Medium curly',
  longStraight: 'Long straight',
  longCurly: 'Long curly',
  braids: 'Braids or locs',
  bun: 'Bun or ponytail',
};

export const HAIR_COLOR_NAMES = {
  black: 'Black',
  darkBrown: 'Dark brown',
  brown: 'Brown',
  lightBrown: 'Light brown',
  blonde: 'Blonde',
  platinum: 'Platinum',
  auburn: 'Auburn',
  grey: 'Grey',
};

export const BEARD_NAMES = {
  none: 'None',
  lightStubble: 'Light stubble',
  heavyStubble: 'Heavy stubble',
  shortBoxed: 'Short boxed',
  full: 'Full',
  long: 'Long',
  garibaldi: 'Garibaldi',
  ducktail: 'Ducktail',
  goatee: 'Goatee',
  anchor: 'Anchor',
  circle: 'Circle',
  chinStrap: 'Chin strap',
  muttonChops: 'Mutton chops',
  soulPatch: 'Soul patch',
};

export const MOUSTACHE_NAMES = {
  none: 'None',
  classic: 'Classic',
  chevron: 'Chevron',
  handlebar: 'Handlebar',
  pencil: 'Pencil',
  horseshoe: 'Horseshoe',
  walrus: 'Walrus',
  fuManchu: 'Fu Manchu',
};

// Each face feature (face.js FEATURE_CHOICES): its control's label and the
// name of each choice.
export const FEATURE_NAMES = {
  shape: {
    label: 'Face shape',
    choices: { oval: 'Oval', round: 'Round', square: 'Square', heart: 'Heart', oblong: 'Oblong', diamond: 'Diamond', triangle: 'Triangle', rectangle: 'Rectangle' },
  },
  eyeShape: {
    label: 'Eye shape',
    choices: { almond: 'Almond', round: 'Round', hooded: 'Hooded', monolid: 'Monolid', upturned: 'Upturned', downturned: 'Downturned', deepSet: 'Deep-set', closeSet: 'Close-set' },
  },
  eyeColor: {
    label: 'Eye color',
    choices: { darkBrown: 'Dark brown', brown: 'Brown', amber: 'Amber', hazel: 'Hazel', green: 'Green', blue: 'Blue', lightBlue: 'Light blue', grey: 'Grey' },
  },
  brows: {
    label: 'Eyebrows',
    choices: { straight: 'Straight', softArch: 'Soft arch', highArch: 'High arch', rounded: 'Rounded', thick: 'Thick', thin: 'Thin', bushy: 'Bushy', angled: 'Angled' },
  },
  nose: {
    label: 'Nose',
    choices: { straight: 'Straight', button: 'Button', rounded: 'Rounded', wide: 'Wide', narrow: 'Narrow', upturned: 'Upturned', aquiline: 'Aquiline', flat: 'Flat' },
  },
  mouth: {
    label: 'Mouth',
    choices: { medium: 'Medium', full: 'Full', thin: 'Thin', wide: 'Wide', small: 'Small', heartShaped: 'Heart-shaped', fullLower: 'Full lower lip', fullUpper: 'Full upper lip' },
  },
  ears: {
    label: 'Ears',
    choices: { average: 'Average', small: 'Small', large: 'Large', round: 'Round', pointed: 'Pointed', closeToHead: 'Close to the head', protruding: 'Protruding', attachedLobes: 'Attached lobes' },
  },
  lashes: {
    label: 'Eyelashes',
    choices: { natural: 'Natural', medium: 'Medium', long: 'Long' },
  },
  freckles: {
    label: 'Freckles',
    choices: { none: 'None', light: 'Light', medium: 'Medium', heavy: 'Heavy' },
  },
  mark: {
    label: 'Beauty mark',
    choices: { none: 'None', cheek: 'Cheek', chin: 'Chin', aboveLip: 'Above the lip' },
  },
  lines: {
    label: 'Face lines and age',
    choices: { none: 'None', smile: 'Smile lines', forehead: 'Forehead lines', crowsFeet: "Crow's feet", all: 'All' },
  },
  lips: {
    label: 'Lip color',
    choices: { none: 'None', nude: 'Nude', pink: 'Pink', rose: 'Rose', red: 'Red', berry: 'Berry', coral: 'Coral', plum: 'Plum', brown: 'Brown' },
  },
  eyeshadow: {
    label: 'Eyeshadow',
    choices: { none: 'None', taupe: 'Taupe', bronze: 'Bronze', gold: 'Gold', rose: 'Rose', plum: 'Plum', navy: 'Navy', green: 'Green', smoky: 'Smoky' },
  },
  eyeliner: {
    label: 'Eyeliner',
    choices: { none: 'None', thin: 'Thin', winged: 'Winged' },
  },
  blush: {
    label: 'Blush',
    choices: { none: 'None', peach: 'Peach', pink: 'Pink', rose: 'Rose', berry: 'Berry' },
  },
};
