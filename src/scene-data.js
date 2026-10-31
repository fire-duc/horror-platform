// Coordinates belong to the shared 1000 × 650 stage. IDs match the saved game engine.
const spot = (id,label,x,y,effect='wait') => ({id,label,x,y,effect});
export const sceneScripts = {
  'last-train': [
    {cue:'방송이 당신의 이름을 부른다.',spots:[spot('answer','대답하기',34,35,'speak'),spot('quiet','침묵하기',50,80),spot('driver','운전실',50,40,'walk')]},
    {cue:'차창에는 두 사람이 비친다.',spots:[spot('close','눈 감기',50,80,'blink'),spot('look','옆자리 보기',24,61,'turn'),spot('wave','손 흔들기',78,39,'speak')]},
    {cue:'여섯 번째 역. 이름은 없다.',spots:[spot('exit','내리기',50,47,'walk'),spot('stay','기다리기',31,78),spot('call','불러 보기',72,73,'speak')]},
    {cue:'그 사람이 당신의 자리를 본다.',spots:[spot('umbrella','우산 받기',62,50,'reach'),spot('sit','앉아 있기',23,67),spot('stand','손잡이 잡기',76,25,'rise')]},
    {cue:'일곱 번째 역.',spots:[spot('leave','나가기',50,48,'walk'),spot('wait','기다리기',25,73),spot('ride','계속 타기',77,73)]}
  ],
  elevator: [
    {cue:'4층은 존재하지 않는다.',panel:'floors',clue:'4 → 2 → 6 → 2 → 1',spots:[spot('1','1',72,39),spot('2','2',84,39),spot('3','3',72,52),spot('4','4',84,52),spot('5','5',72,65),spot('6','6',84,65)],effect:'descend'},
    {cue:'“몇 층 가세요?”',spots:[spot('talk','대답하기',50,76,'speak'),spot('ignore','버튼만 보기',78,54),spot('mirror','뒤돌아보기',24,48,'turn')]},
    {cue:'B0',panel:'keypad',clue:'비상 호출 000',effect:'descend'},
    {cue:'불이 아직 붉다.',spots:[spot('out','나가기',43,51,'walk'),spot('wait','초록불 기다리기',77,72,'light')]}
  ],
  'night-store': [
    {cue:'계산 전에, 이상한 곳을 찾으세요.',spots:[spot('shadow','발밑',49,75),spot('clock','시계',79,30),spot('basket','장바구니',23,65)],commit:'계산 거절',effect:'dark'},
    {cue:'03:33',spots:[spot('open','문 열기',51,49,'walk'),spot('locked','잠금 유지',70,58),spot('back','뒷문',20,52,'turn')]},
    {cue:'오늘은 10월 31일.',spots:[spot('hands','손',43,54),spot('receipt','영수증',68,61),spot('price','금액',23,43)],commit:'찢기',effect:'tear'},
    {cue:'마감 시간.',spots:[spot('sign','간판 끄기',50,16),spot('turn','뒤돌기',23,77),spot('lock','문 잠그기',65,47)],clue:'잠금 → 간판 → 뒤',effect:'dark'}
  ],
  corridor: [
    {cue:'어딘가 하나가 다르다.',spots:[spot('doors','문',23,50),spot('poster','포스터',77,47),spot('clock','시계',57,33)],commit:'돌아가기',effect:'turn'},
    {cue:'발소리는 하나.',spots:[spot('forward','직진',50,54,'walk'),spot('back','돌아가기',25,80,'turn')]},
    {cue:'누군가 보고 있다.',spots:[spot('doors','문',23,50),spot('poster','포스터',77,47),spot('clock','시계',57,33)],commit:'돌아가기',effect:'turn'},
    {cue:'마지막 복도.',spots:[spot('doors','문',23,50),spot('poster','포스터',77,47),spot('clock','시계',57,33)],commit:'돌아가기',effect:'turn'}
  ],
  classroom: [
    {cue:'출석부는 27명. 지금은 28번째.',spots:[spot('here','대답하기',52,48,'speak'),spot('silent','침묵하기',50,80)]},
    {cue:'종이 울린다.',spots:[spot('hide','책상 아래',50,78,'hide'),spot('stay','앉아 있기',74,77),spot('window','창문 보기',18,39,'turn')]},
    {cue:'지우개를 들었다.',spots:[spot('sentence','문장 지우기',50,46),spot('date','날짜 지우기',36,25),spot('name','이름 지우기',66,32)],clue:'날짜 → 이름 → 문장',effect:'erase'},
    {cue:'선생님이 등을 돌렸다.',spots:[spot('front','앞문',26,48,'walk'),spot('back','뒷문',79,58,'walk'),spot('thank','인사하기',57,42,'speak')]}
  ],
  ward: [
    {cue:'등록 병실 101 · 202',spots:[spot('enter','303호',50,47,'walk'),spot('cancel','호출 취소',79,32),spot('name','이름 묻기',35,75,'speak')]},
    {cue:'맥박 0',spots:[spot('curtain','커튼 닫기',72,41,'curtain'),spot('ask','이름 묻기',43,56,'speak'),spot('pulse','손목 잡기',31,70,'reach')]},
    {cue:'등록된 두 병실의 합.',panel:'keypad',clue:'101 + 202',effect:'unlock'},
    {cue:'순회 종료.',spots:[spot('red','발자국 따라가기',70,76,'walk'),spot('blue','파란 선 따라가기',32,76,'walk')]}
  ],
  cctv: [
    {cue:'이상 채널을 찾으세요.',spots:[spot('cam1','01',28,29),spot('cam2','02',72,29),spot('cam3','03',28,64),spot('cam4','04',72,64)],commit:'채널 차단',effect:'signal'},
    {cue:'한 화면이 바뀌었다.',spots:[spot('cam1','01',28,29),spot('cam2','02',72,29),spot('cam3','03',28,64),spot('cam4','04',72,64)],commit:'채널 차단',effect:'signal'},
    {cue:'정상 신호.',spots:[spot('next','다음 순찰',67,87,'scan'),spot('all','전체 차단',33,87,'signal')]},
    {cue:'이 방에는 카메라가 없다.',spots:[spot('cam1','01',28,29),spot('cam2','02',72,29),spot('cam3','03',28,64),spot('cam4','04',72,64)],commit:'채널 차단',effect:'signal'}
  ],
  laundry: [
    {cue:'세탁물을 넣으세요.',spots:[spot('black','검정',76,77),spot('white','흰색',24,77),spot('gray','회색',50,77)],clue:'흰색 → 회색 → 검정',effect:'spin'},
    {cue:'안에서 노크 소리가 난다.',spots:[spot('stop','정지',75,32),spot('continue','계속 작동',23,77),spot('knock','두드리기',50,49,'reach')]},
    {cue:'00:00',spots:[spot('open','문 열기',50,49,'reach'),spot('wait','기다리기',24,78)]},
    {cue:'당신의 것만 가져가세요.',spots:[spot('mine','내 이름',28,72,'reach'),spot('other','더 깨끗한 나',73,72,'reach')]}
  ],
  phone: [
    {cue:'발신번호 없음.',spots:[spot('answer','수화기 들기',49,34,'reach'),spot('wait','기다리기',23,77)]},
    {cue:'연결 번호.',panel:'keypad',clue:'104',effect:'connect'},
    {cue:'“지금 어디야?”',spots:[spot('location','위치 말하기',28,76,'speak'),spot('refuse','말하지 않기',50,76),spot('home','집 주소',73,76,'speak')]},
    {cue:'통화를 끊으세요.',panel:'phone',spots:[spot('#','#',69,65),spot('0','0',50,65),spot('*','*',31,65)],clue:'* → 0 → #',effect:'disconnect'}
  ],
  hotel: [
    {cue:'주문한 적 없는 룸서비스.',spots:[spot('open','문 열기',62,59,'walk'),spot('closed','잠금 유지',29,76),spot('reply','대답하기',50,76,'speak')]},
    {cue:'당신은 움직이지 않았다.',spots:[spot('copy','따라 하기',45,48,'reach'),spot('cover','수건 덮기',77,70,'cover'),spot('break','거울 깨기',22,76,'reach')]},
    {cue:'객실 번호를 거꾸로.',panel:'keypad',clue:'307 ↶',effect:'unlock'},
    {cue:'문밖에서 당신의 목소리가 들린다.',spots:[spot('now','문 열기',62,59,'walk'),spot('silent','멀어질 때까지',30,76)]}
  ]
};

// Advance only visible, unpaused time. A large frame gap must not skip the scene.
export function tickScene(clock,now,paused) {
  const delta=clock.last===null||paused ? 0 : Math.min(Math.max(now-clock.last,0),80);
  return {last:now,elapsed:clock.elapsed+delta};
}
