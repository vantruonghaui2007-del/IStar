export type InstrumentId = 'dan-bau' | 'sao-truc' | 'dan-tranh' | 'trong-com'
export type Species = 'sen' | 'tre' | 'dao' | 'lua'

export type Instrument = {
  id: InstrumentId
  name: string
  /** The plant this instrument grows. */
  plant: string
  species: Species
  /** MIDI note of the lowest hò. */
  baseMidi: number
  /** Swatch colours for the picker: stem, leaf, flower. */
  swatch: [string, string, string]
  /** What the instrument is, in a few true sentences. */
  about: string[]
  /** How to play it with a hand in front of the camera (or the mouse). */
  howTo: string[]
}

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  'dan-bau': {
    id: 'dan-bau',
    name: 'Đàn bầu',
    plant: 'Hoa sen',
    species: 'sen',
    baseMidi: 55,
    swatch: ['#4f7f52', '#6fa865', '#e98aa0'],
    about: [
      'Nhạc cụ một dây độc đáo của người Việt.',
      'Tay phải gảy vào điểm bồi âm trên dây, tay trái uốn cần đàn (vòi đàn) để nốt nhạc luyến lên xuống mềm mại như giọng hát.',
      'Gắn với hát xẩm và các làn điệu dân ca.',
    ],
    howTo: ['Chụm ngón để gảy một tiếng đàn.', 'Giữ chụm, đưa tay lên cao hoặc xuống thấp để luyến nốt như uốn cần đàn.', 'Thả tay để tiếng đàn ngân và hoa sen nở.'],
  },
  'sao-truc': {
    id: 'sao-truc',
    name: 'Sáo trúc',
    plant: 'Cây tre',
    species: 'tre',
    baseMidi: 62,
    swatch: ['#6f9a3f', '#86b04f', '#c9d98a'],
    about: [
      'Ống sáo làm từ tre, trúc; thổi ngang, thường có 6 lỗ bấm.',
      'Tiếng sáo trong, ngân dài; người thổi láy, rung hơi để tạo sắc thái.',
      'Quen thuộc với hình ảnh cánh đồng, lũy tre làng.',
    ],
    howTo: ['Chụm và giữ để thổi một nốt ngân dài.', 'Đưa tay lên để lên nốt cao, xuống để xuống nốt thấp — tiếng sáo đi theo tay.', 'Thả tay để ngắt hơi; cây tre mọc theo đường bạn thổi.'],
  },
  'dan-tranh': {
    id: 'dan-tranh',
    name: 'Đàn tranh',
    plant: 'Cành đào',
    species: 'dao',
    baseMidi: 55,
    swatch: ['#5a3b2e', '#7e5a48', '#f4a3b4'],
    about: [
      'Còn gọi là đàn thập lục vì có 16 dây.',
      'Người chơi gảy bằng móng; tay trái nhấn dây để luyến, láy.',
      'Kỹ thuật rải — lướt qua nhiều dây liên tiếp — tạo âm thanh như nước chảy.',
    ],
    howTo: ['Mỗi cột dọc của khu vườn là một dây đàn: trái trầm, phải bổng.', 'Chụm tại chỗ để gảy một dây.', 'Chụm rồi lướt tay ngang để rải dây — mỗi dây vang lên một bông đào.'],
  },
  'trong-com': {
    id: 'trong-com',
    name: 'Trống cơm',
    plant: 'Bông lúa',
    species: 'lua',
    baseMidi: 43,
    swatch: ['#8aa04a', '#a9b95b', '#e3b94e'],
    about: [
      'Trống hai mặt; mặt trống được bịt cơm nghiền để chỉnh độ cao tiếng trống.',
      'Giữ nhịp trong chèo, phường bát âm và các buổi hội làng.',
      'Có bài dân ca quan họ “Trống cơm” nổi tiếng.',
    ],
    howTo: ['Chụm nhanh rồi thả để gõ một tiếng trống.', 'Gõ ở nửa dưới cho tiếng “tùng” trầm, nửa trên cho tiếng “tình” cao.', 'Gõ theo nhịp đều để ruộng lúa mọc thành hàng.'],
  },
}

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS) as InstrumentId[]
export const isInstrumentId = (value: unknown): value is InstrumentId => typeof value === 'string' && value in INSTRUMENTS
