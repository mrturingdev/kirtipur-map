/* ------------------------------------------------------------------ */
/* The six places the diorama is about, defined once. Everything that  */
/* treats them specially reads this list: the ground (levelled and     */
/* paved, houses left out round them: terrain.js / city.js), their     */
/* models (uma.js, lyaku.js, bhairab.js, pukhu.js, lohan.js,           */
/* chilancho.js), labels, close-ups, the Places bar, collapsing houses */
/* (hud.js) and where people walk to (life.js).                        */
/*                                                                     */
/* Map metres from Bagh Bhairab (x east, z south). `site` is the       */
/* ground they own: an OSM area by name, a rectangle in a building's   */
/* own frame [id, x0, x1, z0, z1], the OSM common round a point, or a  */
/* circle. `own` lists OSM buildings the model replaces.               */
/* ------------------------------------------------------------------ */
// Each place's `history` is a short sourced note (municipal heritage listing numbers and
// coordinates, where known, come from the same listings cited in NOTES-gnhf.md); `photos`
// lists two openly-licensed photos per place, credited, served from img/<key>/<file>.
const FOCUS = [
  { key: 'uma', name: 'Uma Maheshwar', at: [-178.9, -56.7], site: { rect: [323644534, -12.2, 11.6, -15.6, 9.9] }, paint: 'brick', margin: 6,
    h: 16, r: 12, zoom: 0.075, collapse: 26, pose: 'pray',
    text: 'Uma Maheshwar on the hilltop: three tiered roofs over a tall brick plinth, stone elephants at the stair.',
    history: "A three-roofed pagoda temple dedicated to Shiva and Parvati (Uma Maheshwar), on a stepped brick plinth at the highest point of Kirtipur's ridge, with stone elephants flanking the stair and a railed plaza reached through an arched gate. Its municipal heritage listing (NP-KTMKP-29) places it at roughly 27.6801°N, 85.2751°E; the hilltop plaza looks out over the Kathmandu valley.",
    photos: [
      { file: 'uma-maheshwar-01.jpg', alt: 'Uma Maheshwar temple seen from below the stair, with its arched gate and white plinth wall.', author: 'Nabin K. Sapkota', date: '22 September 2018', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Uma_Maheshwar_Kritipur_01.jpg' },
      { file: 'uma-maheshwar-02.jpg', alt: "Uma Maheshwar temple's three mossy roofs and columned ground storey, front elevation.", author: 'Nabin K. Sapkota', date: '22 September 2018', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Uma_Maheshwar_Kritipur_05.jpg' }
    ] },
  { key: 'lyaku', name: 'Lyaku Museum', at: [-124.5, -3], site: { circle: 10 }, paint: 'brick', margin: 1.5, own: [342148871],
    h: 13, r: 10, zoom: 0.07, collapse: 24, pose: 'photo',
    text: 'Lyaku, the old palace quarter: the museum in its carved palace house, the dry-stone wall and the carved gateway over the lane.',
    history: 'Lyaku (Layaku) is Kirtipur\'s old palace quarter: a carved multi-storey Newar palace house facing an open square, reached by a stepped lane lined with a dry-stone rubble wall and a carved gateway. "Layaku" is the Newar word for a royal palace or palace square, the same root as Kathmandu, Patan and Bhaktapur\'s own Durbar Squares.',
    photos: [
      { file: 'lyaku-01.jpg', alt: 'The carved three-storey Newar palace house at Lyaku, with an open-air market in front of it.', author: 'Avista7', date: '30 June 2018', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Kirtipur_18th_century_palace..jpg' },
      { file: 'lyaku-02.jpg', alt: 'The Layaku lane in Kirtipur, lined with red Newar buildings, looking toward the square.', author: 'Sunil kawan', date: '30 September 2019', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Layaku,_Kirtipur.jpg' }
    ] },
  { key: 'bhairab', name: 'Bagh Bhairab', at: [-2.5, -5.1], site: { area: 'Baghbhairab' }, paint: 'brick', margin: 10,
    h: 20, r: 12, zoom: 0.075, collapse: 34, pose: 'pray',
    text: 'Bagh Bhairab: the three-roofed pagoda on a cream ground storey in dark timber, named shrines ringing its court, facing Dey Pukhu.',
    history: "Bagh Bhairab is Kirtipur's largest temple, dedicated to Bhairab worshipped here in the form of a tiger (bagh). A three-roofed pagoda on a cream ground storey in a dark timber frame, it stands in a court with named shrines to Yamaleshwar, Narayan, Bhawani Shankar, Ram Chandra, Mana Binayek, Nasa Deu, Indrayani and Mul Ganesh, facing the Dey Pukhu tank. Its municipal heritage listing (NP-KTMKP-28) places it at roughly 27.6795°N, 85.2760°E.",
    photos: [
      { file: 'bagh-bhairab-01.jpg', alt: "Bagh Bhairab temple's three-roofed pagoda front elevation, cream ground storey in a dark timber frame.", author: 'Nabin K. Sapkota', date: '22 September 2018', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Bagh_Bhairab_Temple,_Kirtipur_01.jpg' },
      { file: 'bagh-bhairab-02.jpg', alt: "Bagh Bhairab temple's lower tiled roofs with moss and grass growing near the ridge.", author: 'Harry Paudyal', date: '22 September 2018', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Bagh_Bhairab_Kritipur_IMG_8037_06.jpg' }
    ] },
  { key: 'pukhu', name: 'Dey Pukhu', at: [-21.9, 68.7], site: { commonAt: true }, paint: 'paved', margin: 1,
    h: 8, r: 13, zoom: 0.07, collapse: 30, pose: 'idle',
    text: 'Dey Pukhu: the walled tank of still water, the white Narayan shrine at its west end.',
    history: 'Dey Pukhu ("the town pond") is a walled, sunken water tank below Bagh Bhairab, long used by the surrounding neighbourhood. Its brick walls step down to the water on a grey band, and its surface is typically covered in duckweed. A small white Narayan shrine with its own pagoda roof and a stone pillar stands at the tank\'s west end.',
    photos: [
      { file: 'dey-pukhu-01.jpg', alt: "Dey Pukhu tank covered in green duckweed, brick houses along one side and the Narayan shrine's spire visible at the far end.", author: 'Rajesh Dhungana', date: '6 August 2021', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Depukhu_Pokhari_(Pond)_Historical_Kirtipur_Kathmandu_Nepal_Rajesh_Dhungana_(1).jpg' },
      { file: 'dey-pukhu-02.jpg', alt: 'Dey Pukhu tank from the opposite bank, with tiered brick and timber houses along its edge.', author: 'Rajesh Dhungana', date: '6 August 2021', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Depukhu_Pokhari_(Pond)_Historical_Kirtipur_Kathmandu_Nepal_Rajesh_Dhungana_(2).jpg' }
    ] },
  { key: 'lohan', name: 'Lohan Dega', at: [106.7, 173.6], site: { circle: 9 }, paint: 'brick', margin: 1,
    h: 13, r: 7, zoom: 0.06, collapse: 24, pose: 'pray',
    text: 'Lohan Dega, the stone temple: a stepped plinth, an arcaded shrine and a tall ribbed shikhara in its little brick square.',
    history: 'Lohan Dega (also spelled Lodegal or Lon Degah) is a stone, shikhara-style temple in a small brick square, one of relatively few all-stone temples in the Kathmandu valley. It stands on a stepped stone plinth, with an arcaded shrine storey and a tall, ribbed stone tower, and is said locally to date from the Malla era. No photo of it is clearly identified on Wikimedia Commons under its name or known alternate spellings, so these photos are Mapillary street-level imagery captured a few steps from its mapped location.',
    photos: [
      { file: 'lohan-dega-01.jpg', alt: "Lohan Dega's stone shikhara tower and arcaded shrine storey seen down a narrow brick lane in Kirtipur.", author: 'brojenmay (Mapillary)', date: '17 May 2022', licence: 'CC BY-SA 4.0', source: 'https://www.mapillary.com/app/?pKey=168746835570204' },
      { file: 'lohan-dega-02.jpg', alt: "Lohan Dega's stepped stone plinth and shikhara tower framed by the brick houses of the surrounding lane.", author: 'brojenmay (Mapillary)', date: '17 May 2022', licence: 'CC BY-SA 4.0', source: 'https://www.mapillary.com/app/?pKey=132826862682414' }
    ] },
  { key: 'stupa', name: 'Chilancho', at: [140.9, 274.8], site: { rect: [1074769018, -24, 30, -24, 24] }, paint: 'paved', margin: 3,
    h: 16, r: 14, zoom: 0.085, collapse: 30, pose: 'pray',
    text: 'Chilancho: the white dome and gilded spire, four corner stupas, prayer flags over the square.',
    history: "Chilancho (Chilancho Vihar) is Kirtipur's main Buddhist stupa and monastery courtyard, on a brick plinth with a white dome and a gilded spire. Four smaller corner stupas stand at the plinth's corners, within a walled, iron-fenced courtyard with stone lions at its gate, brick chaityas and a red-fringed pati shelter. Its municipal heritage listing (NP-KTMKP-27) places it at roughly 27.6766°N, 85.2785°E.",
    photos: [
      { file: 'chilancho-01.jpg', alt: 'The main stupa at Chilancho: a white dome with a gilded spire on a mossy brick plinth with corner shrines.', author: 'Nabin K. Sapkota', date: '22 September 2018', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Chilancho,_Kirtipur_19.jpg' },
      { file: 'chilancho-02.jpg', alt: 'Wide view of the Chilancho courtyard, the main stupa and two of its smaller corner stupas, with shrines and worshippers.', author: 'Sunil kawan', date: '30 September 2019', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Chilancho_Vihar.jpg' }
    ] }
];
const focusOf = (key) => FOCUS.find((F_) => F_.key === key);
