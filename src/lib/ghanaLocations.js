const DELIVERY_ZONE_IDS = {
  ACCRA: 'accra',
  KUMASI: 'kumasi',
  UMAT_DOORSTEP: 'umat_doorstep',
  TARKWA: 'tarkwa',
  OUTSIDE: 'outside',
  BUS_STATION: 'bus_station',
};

export function normalizeLocationValue(value = '') {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/metropolitan/g, ' metro ')
    .replace(/municipality/g, ' municipal ')
    .replace(/district assembly/g, ' district ')
    .replace(/municipal assembly/g, ' municipal ')
    .replace(/metropolitan assembly/g, ' metro ')
    .replace(/region/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toAliasList(value) {
  if (Array.isArray(value)) return value;
  return [value];
}

function createEntry(name, aliases = []) {
  return {
    name,
    aliases: [...new Set([name, ...toAliasList(aliases)].map(normalizeLocationValue).filter(Boolean))],
  };
}

const REGION_SURROGATES = {
  accra: 'greater_accra',
  kumasi: 'ashanti',
  tarkwa: 'western',
};

const GHANA_REGION_DATA = [
  {
    key: 'greater_accra',
    name: 'Greater Accra',
    aliases: ['Accra Region', 'Greater Accra Region', 'Accra'],
    districts: [
      createEntry('Accra Metropolitan'),
      createEntry('Ablekuma Central'),
      createEntry('Ablekuma North'),
      createEntry('Ablekuma West'),
      createEntry('Adenta Municipal'),
      createEntry('Ashaiman Municipal'),
      createEntry('Ayawaso Central'),
      createEntry('Ayawaso East'),
      createEntry('Ayawaso North'),
      createEntry('Ayawaso West Municipal'),
      createEntry('Ga Central Municipal'),
      createEntry('Ga East Municipal'),
      createEntry('Ga North Municipal'),
      createEntry('Ga South Municipal'),
      createEntry('Ga West Municipal'),
      createEntry('Korle Klottey Municipal'),
      createEntry('Kpone Katamanso Municipal'),
      createEntry('Krowor Municipal'),
      createEntry('La Dade Kotopon Municipal', ['LaDMA']),
      createEntry('La Nkwantanang Madina Municipal', ['Madina', 'La Nkwantanang', 'Madina Municipal']),
      createEntry('Ledzokuku Municipal'),
      createEntry('Ningo Prampram'),
      createEntry('Okaikwei North Municipal'),
      createEntry('Shai Osudoku'),
      createEntry('Tema Metropolitan'),
      createEntry('Tema West Municipal'),
      createEntry('Weija Gbawe Municipal', ['Weija', 'Gbawe']),
    ],
    places: [
      createEntry('Accra'),
      createEntry('Tema'),
      createEntry('Madina'),
      createEntry('East Legon'),
      createEntry('West Legon'),
      createEntry('North Legon'),
      createEntry('Legon', ['University of Ghana', 'UG Legon']),
      createEntry('Spintex'),
      createEntry('Adenta'),
      createEntry('Ashongman', ['Ashongman Estate']),
      createEntry('Osu'),
      createEntry('Labone'),
      createEntry('Cantonments'),
      createEntry('Airport Residential Area', ['Airport Residential']),
      createEntry('Ridge'),
      createEntry('Dzorwulu'),
      createEntry('Tesano'),
      createEntry('Abelemkpe'),
      createEntry('Abeka'),
      createEntry('Achimota'),
      createEntry('Ashaley Botwe'),
      createEntry('Teshie'),
      createEntry('Nungua'),
      createEntry('Labadi'),
      createEntry('Dansoman'),
      createEntry('Kaneshie'),
      createEntry('Circle', ['Kwame Nkrumah Circle']),
      createEntry('Korle Bu'),
      createEntry('Weija'),
      createEntry('Gbawe'),
      createEntry('Mallam'),
      createEntry('Lapaz'),
      createEntry('Ashaiman'),
      createEntry('Sakumono'),
      createEntry('Community 18'),
      createEntry('Community 25'),
      createEntry('Kokomlemle'),
      createEntry('Roman Ridge'),
      createEntry('Haatso'),
      createEntry('Pokuase'),
      createEntry('Prampram'),
      createEntry('Dodowa'),
    ],
  },
  {
    key: 'ashanti',
    name: 'Ashanti',
    aliases: ['Ashanti Region', 'Kumasi'],
    districts: [
      createEntry('Kumasi Metropolitan', ['Kumasi Metro']),
      createEntry('Asokwa Municipal'),
      createEntry('Oforikrom Municipal'),
      createEntry('Suame Municipal'),
      createEntry('Tafo Municipal'),
      createEntry('Old Tafo Municipal'),
      createEntry('Kwabre East Municipal'),
      createEntry('Atwima Kwanwoma'),
      createEntry('Atwima Nwabiagya Municipal'),
      createEntry('Atwima Nwabiagya North District'),
      createEntry('Atwima Mponua'),
      createEntry('Afigya Kwabre North'),
      createEntry('Afigya Kwabre South'),
      createEntry('Ahafo Ano North Municipal'),
      createEntry('Ahafo Ano South East'),
      createEntry('Ahafo Ano South West'),
      createEntry('Adansi Asokwa'),
      createEntry('Adansi North'),
      createEntry('Adansi South'),
      createEntry('Amansie Central'),
      createEntry('Amansie South'),
      createEntry('Amansie West'),
      createEntry('Asante Akim Central Municipal'),
      createEntry('Asante Akim North'),
      createEntry('Asante Akim South Municipal'),
      createEntry('Asokore Mampong Municipal'),
      createEntry('Asokore Mampong'),
      createEntry('Bekwai Municipal'),
      createEntry('Bosome Freho'),
      createEntry('Bosomtwe'),
      createEntry('Ejisu Municipal', ['Ejisu Juaben', 'Ejisu-Juaben']),
      createEntry('Juaben Municipal'),
      createEntry('Mampong Municipal'),
      createEntry('Obuasi Municipal'),
      createEntry('Obuasi East'),
      createEntry('Offinso Municipal'),
      createEntry('Offinso North'),
      createEntry('Sekyere Afram Plains'),
      createEntry('Sekyere Central'),
      createEntry('Sekyere East'),
      createEntry('Sekyere Kumawu'),
      createEntry('Sekyere South'),
      createEntry('Sekyere South District'),
    ],
    places: [
      createEntry('Kumasi'),
      createEntry('KNUST Campus', ['KNUST', 'Kwame Nkrumah University of Science and Technology', 'Tech Junction']),
      createEntry('Abuakwa', ['Abuakwa Kumasi']),
      createEntry('Manhyia'),
      createEntry('Krofrom'),
      createEntry('Abrepo Junction', ['Abrepo']),
      createEntry('Bantama'),
      createEntry('Kejetia'),
      createEntry('Asafo'),
      createEntry('Santasi'),
      createEntry('Patasi'),
      createEntry('North Suntreso', ['Suntreso']),
      createEntry('Amakom'),
      createEntry('Adum'),
      createEntry('Dichemso'),
      createEntry('Ahodwo'),
      createEntry('Danyame'),
      createEntry('Suame'),
      createEntry('Tafo', ['Old Tafo']),
      createEntry('Atonsu'),
      createEntry('Asokwa'),
      createEntry('Oforikrom'),
      createEntry('Sofoline'),
      createEntry('Tanoso'),
      createEntry('Dakodwom'),
      createEntry('Bohyen'),
      createEntry('Kaase'),
      createEntry('Airport Residential Area', ['Kumasi Airport Residential Area', 'Airport Residential']),
      createEntry('Ridge', ['Kumasi Ridge']),
      createEntry('Nhyiaeso'),
      createEntry('Ayeduase', ['Ayeduase KNUST']),
      createEntry('Kotei'),
      createEntry('Kentinkrono'),
      createEntry('Bomso'),
      createEntry('Asuoyeboa'),
      createEntry('Ejisu'),
      createEntry('Mamponteng'),
      createEntry('Obuasi'),
      createEntry('Bekwai'),
      createEntry('Mampong'),
      createEntry('Konongo'),
    ],
  },
  {
    key: 'western',
    name: 'Western',
    aliases: ['Western Region', 'Tarkwa'],
    districts: [
      createEntry('Ahanta West Municipal'),
      createEntry('Amenfi Central'),
      createEntry('Amenfi West Municipal'),
      createEntry('Effia Kwesimintsim Municipal', ['Effia-Kwesimintsim']),
      createEntry('Ellembelle'),
      createEntry('Jomoro Municipal'),
      createEntry('Mpohor'),
      createEntry('Nzema East Municipal'),
      createEntry('Prestea Huni Valley Municipal', ['Prestea-Huni Valley']),
      createEntry('Sekondi Takoradi Metropolitan', ['Sekondi-Takoradi Metropolitan', 'STMA']),
      createEntry('Shama District', ['Shama']),
      createEntry('Tarkwa Nsuaem Municipal', ['Tarkwa-Nsuaem Municipal', 'Tarkwa Nsuaem']),
      createEntry('Wassa Amenfi East Municipal', ['Wassa East']),
    ],
    places: [
      createEntry('Tarkwa'),
      createEntry('UMaT Campus', ['UMAT', 'UMaT', 'University of Mines and Technology', 'UMAT Main Campus', 'Umat Main Campus']),
      createEntry('Tarkwa New Site', ['New Site']),
      createEntry('Tarkwa Old Station', ['Old Station']),
      createEntry('Tamso'),
      createEntry('Aboso'),
      createEntry('Nsuaem'),
      createEntry('Prestea'),
      createEntry('Huni Valley'),
      createEntry('Bogoso'),
      createEntry('Sekondi'),
      createEntry('Takoradi'),
      createEntry('Axim'),
      createEntry('Agona Nkwanta'),
      createEntry('Shama'),
    ],
  },
  {
    key: 'western_north',
    name: 'Western North',
    aliases: ['Western North Region'],
    districts: [
      createEntry('Aowin Municipal'),
      createEntry('Bia East District'),
      createEntry('Bia West District'),
      createEntry('Bibiani Anhwiaso Bekwai Municipal', ['Bibiani Anhwiaso-Bekwai']),
      createEntry('Bodi District', ['Bodi']),
      createEntry('Juaboso District', ['Juaboso']),
      createEntry('Sefwi Akontombra District', ['Akontombra']),
      createEntry('Sefwi Wiawso Municipal'),
      createEntry('Suaman District', ['Suaman']),
      createEntry('Wiawso Municipal'),
    ],
    places: [
      createEntry('Bibiani'),
      createEntry('Sefwi Wiawso'),
      createEntry('Juaboso'),
      createEntry('Bodi'),
      createEntry('Aowin'),
      createEntry('Akontombra'),
      createEntry('Enchi'),
      createEntry('Asawinso'),
      createEntry('Dadieso'),
    ],
  },
  {
    key: 'central',
    name: 'Central',
    aliases: ['Central Region'],
    districts: [
      createEntry('Abura Asebu Kwamankese District', ['Abura Asebu Kwamankese']),
      createEntry('Agona East District', ['Agona East']),
      createEntry('Agona West Municipal', ['Agona West']),
      createEntry('Ajumako Enyan Essiam District', ['Ajumako Enyan Essiam']),
      createEntry('Asikuma Odoben Brakwa District', ['Asikuma Odoben Brakwa']),
      createEntry('Assin Central Municipal', ['Assin Central']),
      createEntry('Assin Fosu Municipal', ['Assin Fosu']),
      createEntry('Assin North District', ['Assin North']),
      createEntry('Awutu Senya East Municipal', ['Awutu Senya East']),
      createEntry('Awutu Senya West District', ['Awutu Senya West']),
      createEntry('Cape Coast Metropolitan'),
      createEntry('Effutu Municipal', ['Effutu']),
      createEntry('Ekumfi District', ['Ekumfi']),
      createEntry('Gomoa East District', ['Gomoa East']),
      createEntry('Gomoa West District', ['Gomoa West']),
      createEntry('Komenda Edina Eguafo Abirem Municipal', ['KEEA Municipal', 'Komenda Edina Eguafo Abirem']),
      createEntry('Mfantsiman Municipal', ['Mfantsiman']),
      createEntry('Twifo Atti Morkwa District', ['Twifo Atti Morkwa']),
      createEntry('Twifo Hemang Lower Denkyira District', ['Twifo Hemang Lower Denkyira']),
      createEntry('Upper Denkyira East Municipal', ['Upper Denkyira East']),
      createEntry('Upper Denkyira West District', ['Upper Denkyira West']),
    ],
    places: [
      createEntry('Cape Coast'),
      createEntry('Winneba'),
      createEntry('Elmina'),
      createEntry('Mankessim'),
      createEntry('Swedru'),
      createEntry('Dunkwa on Offin', ['Dunkwa-On-Offin']),
      createEntry('Assin Fosu'),
      createEntry('Breman Asikuma'),
      createEntry('Apam'),
      createEntry('Buduburam'),
    ],
  },
  {
    key: 'eastern',
    name: 'Eastern',
    aliases: ['Eastern Region'],
    districts: [
      createEntry('Akuapem North Municipal'),
      createEntry('Akuapem South District'),
      createEntry('Akyemansa District', ['Akyemansa']),
      createEntry('Asene Manso Akroso District', ['Asene Manso Akroso']),
      createEntry('Asuogyaman District', ['Asuogyaman']),
      createEntry('Atiwa East District', ['Atiwa East']),
      createEntry('Atiwa West District', ['Atiwa West']),
      createEntry('Ayensuano District', ['Ayensuano']),
      createEntry('Birim Central Municipal', ['Birim Central']),
      createEntry('Birim North District', ['Birim North']),
      createEntry('Birim South District', ['Birim South']),
      createEntry('Denkyembour District', ['Denkyembour']),
      createEntry('East Akim Municipal', ['East Akim']),
      createEntry('Fanteakwa North District', ['Fanteakwa North']),
      createEntry('Fanteakwa South District', ['Fanteakwa South']),
      createEntry('Kwaebibirem Municipal', ['Kwaebibirem']),
      createEntry('Kwahu Afram Plains North District', ['Kwahu Afram Plains North']),
      createEntry('Kwahu Afram Plains South District', ['Kwahu Afram Plains South']),
      createEntry('Kwahu East District', ['Kwahu East']),
      createEntry('Kwahu South District', ['Kwahu South']),
      createEntry('Kwahu West Municipal', ['Kwahu West']),
      createEntry('Lower Manya Krobo Municipal', ['Lower Manya Krobo']),
      createEntry('New Juaben North Municipal', ['New Juaben North']),
      createEntry('New Juaben South Municipal', ['New Juaben South']),
      createEntry('Nsawam Adoagyiri Municipal', ['Nsawam Adoagyiri']),
      createEntry('Okere District', ['Okere']),
      createEntry('Suhum Municipal', ['Suhum']),
      createEntry('Upper Manya Krobo District', ['Upper Manya Krobo']),
      createEntry('Upper West Akim District', ['Upper West Akim']),
      createEntry('West Akim Municipal', ['West Akim']),
      createEntry('Yilo Krobo Municipal', ['Yilo Krobo']),
    ],
    places: [
      createEntry('Koforidua'),
      createEntry('Nkawkaw'),
      createEntry('Nsawam'),
      createEntry('Suhum'),
      createEntry('Akosombo'),
      createEntry('Aburi'),
      createEntry('Akim Oda', ['Oda']),
      createEntry('Mampong Akuapem', ['Mampong']),
      createEntry('Asamankese'),
      createEntry('Begoro'),
      createEntry('Somanya'),
      createEntry('Akim Tafo'),
      createEntry('Mpraeso'),
    ],
  },
  {
    key: 'volta',
    name: 'Volta',
    aliases: ['Volta Region'],
    districts: [
      createEntry('Adaklu District', ['Adaklu']),
      createEntry('Afadzato South District', ['Afadzato South']),
      createEntry('Agotime Ziope District', ['Agotime Ziope']),
      createEntry('Akatsi North District', ['Akatsi North']),
      createEntry('Akatsi South District', ['Akatsi South']),
      createEntry('Anloga District', ['Anloga']),
      createEntry('Central Tongu District', ['Central Tongu']),
      createEntry('Ho Municipal', ['Ho']),
      createEntry('Ho West District', ['Ho West']),
      createEntry('Hohoe Municipal', ['Hohoe']),
      createEntry('Keta Municipal', ['Keta']),
      createEntry('Ketu North Municipal', ['Ketu North']),
      createEntry('Ketu South Municipal', ['Ketu South']),
      createEntry('Kpando Municipal', ['Kpando']),
      createEntry('North Dayi District', ['North Dayi']),
      createEntry('North Tongu District', ['North Tongu']),
      createEntry('South Dayi District', ['South Dayi']),
      createEntry('South Tongu District', ['South Tongu']),
    ],
    places: [
      createEntry('Ho'),
      createEntry('Hohoe'),
      createEntry('Keta'),
      createEntry('Kpando'),
      createEntry('Anloga'),
      createEntry('Akatsi'),
      createEntry('Denu'),
      createEntry('Sogakope'),
      createEntry('Dzodze'),
    ],
  },
  {
    key: 'oti',
    name: 'Oti',
    aliases: ['Oti Region'],
    districts: [
      createEntry('Biakoye District', ['Biakoye']),
      createEntry('Jasikan Municipal', ['Jasikan']),
      createEntry('Kadjebi District', ['Kadjebi']),
      createEntry('Krachi East Municipal', ['Krachi East']),
      createEntry('Krachi Nchumuru District', ['Krachi Nchumuru']),
      createEntry('Krachi West District', ['Krachi West']),
      createEntry('Nkwanta North District', ['Nkwanta North']),
      createEntry('Nkwanta South Municipal', ['Nkwanta South']),
    ],
    places: [
      createEntry('Dambai'),
      createEntry('Jasikan'),
      createEntry('Kadjebi'),
      createEntry('Kete Krachi', ['Krachi']),
      createEntry('Nkwanta'),
    ],
  },
  {
    key: 'northern',
    name: 'Northern',
    aliases: ['Northern Region'],
    districts: [
      createEntry('Gushegu Municipal', ['Gushegu']),
      createEntry('Karaga District', ['Karaga']),
      createEntry('Kpandai District', ['Kpandai']),
      createEntry('Kumbungu District', ['Kumbungu']),
      createEntry('Mion District', ['Mion']),
      createEntry('Nanton District', ['Nanton']),
      createEntry('Nanumba North Municipal', ['Nanumba North']),
      createEntry('Nanumba South District', ['Nanumba South']),
      createEntry('Saboba District', ['Saboba']),
      createEntry('Sagnarigu Municipal', ['Sagnarigu']),
      createEntry('Savelugu Municipal', ['Savelugu']),
      createEntry('Tamale Metropolitan', ['Tamale Metro']),
      createEntry('Tatale Sanguli District', ['Tatale Sanguli']),
      createEntry('Tolon District', ['Tolon']),
      createEntry('Yendi Municipal', ['Yendi']),
      createEntry('Zabzugu District', ['Zabzugu']),
    ],
    places: [
      createEntry('Tamale'),
      createEntry('Yendi'),
      createEntry('Savelugu'),
      createEntry('Bimbilla'),
      createEntry('Walewale'),
      createEntry('Saboba'),
      createEntry('Gushegu'),
    ],
  },
  {
    key: 'north_east',
    name: 'North East',
    aliases: ['North East Region', 'North-East Region'],
    districts: [
      createEntry('Bunkpurugu Nakpanduri District', ['Bunkpurugu Nakpanduri']),
      createEntry('Chereponi District', ['Chereponi']),
      createEntry('East Mamprusi Municipal', ['East Mamprusi']),
      createEntry('Mamprugu Moagduri District', ['Mamprugu Moagduri']),
      createEntry('West Mamprusi Municipal', ['West Mamprusi']),
      createEntry('Yunyoo Nasuan District', ['Yunyoo Nasuan']),
    ],
    places: [
      createEntry('Nalerigu'),
      createEntry('Walewale'),
      createEntry('Bunkpurugu'),
      createEntry('Chereponi'),
      createEntry('Gambaga'),
    ],
  },
  {
    key: 'savannah',
    name: 'Savannah',
    aliases: ['Savannah Region'],
    districts: [
      createEntry('Bole District', ['Bole']),
      createEntry('Central Gonja District', ['Central Gonja']),
      createEntry('East Gonja Municipal', ['East Gonja']),
      createEntry('North Gonja District', ['North Gonja']),
      createEntry('North East Gonja District', ['North East Gonja']),
      createEntry('Sawla Tuna Kalba District', ['Sawla Tuna Kalba']),
      createEntry('West Gonja Municipal', ['West Gonja']),
    ],
    places: [
      createEntry('Damongo'),
      createEntry('Bole'),
      createEntry('Sawla'),
      createEntry('Salaga'),
    ],
  },
  {
    key: 'upper_east',
    name: 'Upper East',
    aliases: ['Upper East Region'],
    districts: [
      createEntry('Bawku Municipal', ['Bawku']),
      createEntry('Bawku West District', ['Bawku West']),
      createEntry('Binduri District', ['Binduri']),
      createEntry('Bolgatanga East District', ['Bolgatanga East']),
      createEntry('Bolgatanga Municipal', ['Bolgatanga']),
      createEntry('Bongo District', ['Bongo']),
      createEntry('Builsa North Municipal', ['Builsa North']),
      createEntry('Builsa South District', ['Builsa South']),
      createEntry('Garu District', ['Garu']),
      createEntry('Kassena Nankana Municipal', ['Kassena Nankana Municipal']),
      createEntry('Kassena Nankana West District', ['Kassena Nankana West']),
      createEntry('Nabdam District', ['Nabdam']),
      createEntry('Pusiga District', ['Pusiga']),
      createEntry('Talensi District', ['Talensi']),
      createEntry('Tempane District', ['Tempane']),
    ],
    places: [
      createEntry('Bolgatanga'),
      createEntry('Navrongo'),
      createEntry('Bawku'),
      createEntry('Paga'),
      createEntry('Zebilla'),
    ],
  },
  {
    key: 'upper_west',
    name: 'Upper West',
    aliases: ['Upper West Region'],
    districts: [
      createEntry('Daffiama Bussie Issa District', ['Daffiama Bussie Issa']),
      createEntry('Jirapa Municipal', ['Jirapa']),
      createEntry('Lambussie Karni District', ['Lambussie Karni']),
      createEntry('Lawra Municipal', ['Lawra']),
      createEntry('Nadowli Kaleo District', ['Nadowli Kaleo']),
      createEntry('Nandom Municipal', ['Nandom']),
      createEntry('Sissala East Municipal', ['Sissala East']),
      createEntry('Sissala West District', ['Sissala West']),
      createEntry('Wa East District', ['Wa East']),
      createEntry('Wa Municipal', ['Wa']),
      createEntry('Wa West District', ['Wa West']),
    ],
    places: [
      createEntry('Wa'),
      createEntry('Lawra'),
      createEntry('Jirapa'),
      createEntry('Tumu'),
      createEntry('Nandom'),
    ],
  },
  {
    key: 'bono',
    name: 'Bono',
    aliases: ['Bono Region', 'Brong Ahafo West'],
    districts: [
      createEntry('Banda District', ['Banda']),
      createEntry('Berekum East Municipal', ['Berekum East']),
      createEntry('Berekum West District', ['Berekum West']),
      createEntry('Dormaa Central Municipal', ['Dormaa Central']),
      createEntry('Dormaa East District', ['Dormaa East']),
      createEntry('Dormaa West District', ['Dormaa West']),
      createEntry('Jaman North District', ['Jaman North']),
      createEntry('Jaman South Municipal', ['Jaman South']),
      createEntry('Sunyani Municipal', ['Sunyani']),
      createEntry('Sunyani West Municipal', ['Sunyani West']),
      createEntry('Tain District', ['Tain']),
      createEntry('Wenchi Municipal', ['Wenchi']),
    ],
    places: [
      createEntry('Sunyani'),
      createEntry('Berekum'),
      createEntry('Dormaa Ahenkro'),
      createEntry('Wenchi'),
      createEntry('Techiman'),
    ],
  },
  {
    key: 'bono_east',
    name: 'Bono East',
    aliases: ['Bono East Region'],
    districts: [
      createEntry('Atebubu Amantin Municipal', ['Atebubu Amantin']),
      createEntry('Kintampo North Municipal', ['Kintampo North']),
      createEntry('Kintampo South District', ['Kintampo South']),
      createEntry('Nkoranza North District', ['Nkoranza North']),
      createEntry('Nkoranza South Municipal', ['Nkoranza South']),
      createEntry('Pru East District', ['Pru East']),
      createEntry('Pru West District', ['Pru West']),
      createEntry('Sene East District', ['Sene East']),
      createEntry('Sene West District', ['Sene West']),
      createEntry('Techiman Municipal', ['Techiman']),
      createEntry('Techiman North District', ['Techiman North']),
    ],
    places: [
      createEntry('Techiman'),
      createEntry('Kintampo'),
      createEntry('Nkoranza'),
      createEntry('Atebubu'),
      createEntry('Kwame Danso'),
    ],
  },
  {
    key: 'ahafo',
    name: 'Ahafo',
    aliases: ['Ahafo Region'],
    districts: [
      createEntry('Asunafo North Municipal', ['Asunafo North']),
      createEntry('Asunafo South District', ['Asunafo South']),
      createEntry('Asutifi North District', ['Asutifi North']),
      createEntry('Asutifi South District', ['Asutifi South']),
      createEntry('Tano North Municipal', ['Tano North']),
      createEntry('Tano South Municipal', ['Tano South']),
    ],
    places: [
      createEntry('Goaso'),
      createEntry('Bechem'),
      createEntry('Kenyasi'),
      createEntry('Duayaw Nkwanta'),
      createEntry('Mim'),
    ],
  },
];

const KUMASI_PAYMENT_ELIGIBLE_AREAS = [
  'kumasi',
  'knust campus',
  'knust',
  'kwame nkrumah university of science and technology',
  'tech junction',
  'ayeduase',
  'kotei',
  'kentinkrono',
  'bomso',
  'abuakwa',
  'krofrom',
  'abrepo junction',
  'abrepo',
  'bantama',
  'kejetia',
  'asafo',
  'santasi',
  'patasi',
  'north suntreso',
  'suntreso',
  'manhyia',
  'amakom',
  'adum',
  'dichemso',
  'ahodwo',
  'danyame',
  'suame',
  'tafo',
  'old tafo',
  'atonsu',
  'asokwa',
  'oforikrom',
  'sofoline',
  'tanoso',
  'dakodwom',
  'bohyen',
  'kaase',
  'airport residential area',
  'airport residential',
  'ridge',
  'nhyiaeso',
];

const LOCAL_SERVICE_AREAS = {
  accra: [
    'accra', 'tema', 'madina', 'east legon', 'west legon', 'north legon', 'legon', 'spintex', 'adenta',
    'ashongman', 'osu', 'labone', 'cantonments', 'airport residential area', 'airport residential', 'ridge',
    'dzorwulu', 'tesano', 'abelemkpe', 'abeka', 'achimota', 'ashaiman', 'teshie', 'nungua', 'labadi',
    'dansoman', 'kaneshie', 'circle', 'korle bu', 'weija', 'gbawe', 'mallam', 'lapaz', 'sakumono',
    'community 18', 'community 25', 'haatso', 'pokuase', 'roman ridge', 'asaley botwe', 'ashaley botwe'
  ],
  kumasi: KUMASI_PAYMENT_ELIGIBLE_AREAS,
  tarkwa: ['tarkwa', 'tarkwa new site', 'new site', 'tarkwa old station', 'old station', 'tamso', 'aboso', 'nsuaem'],
  umat: ['umat', 'umat campus', 'university of mines and technology', 'umat main campus', 'umat main campus tarkwa'],
};

const regionIndex = new Map();
const localityIndex = [];

for (const region of GHANA_REGION_DATA) {
  const regionAliases = [...new Set([region.name, ...(region.aliases || [])].map(normalizeLocationValue).filter(Boolean))];
  region._aliases = regionAliases;
  regionAliases.forEach((alias) => regionIndex.set(alias, region.key));

  for (const entry of [...region.districts, ...region.places]) {
    localityIndex.push({ regionKey: region.key, name: entry.name, aliases: entry.aliases });
  }
}

function isAliasMatch(input, alias) {
  if (!input || !alias) return false;
  if (input === alias) return true;
  if (input.length >= 4 && alias.includes(input)) return true;
  if (alias.length >= 4 && input.includes(alias)) return true;
  return false;
}

function compactLocationText(...parts) {
  return normalizeLocationValue(parts.filter(Boolean).join(' '));
}

export function resolveRegionKey(regionInput = '') {
  const normalized = normalizeLocationValue(regionInput);
  if (!normalized) return null;
  if (regionIndex.has(normalized)) return regionIndex.get(normalized);
  if (REGION_SURROGATES[normalized]) return REGION_SURROGATES[normalized];

  for (const [alias, regionKey] of regionIndex.entries()) {
    if (isAliasMatch(normalized, alias)) return regionKey;
  }

  for (const [alias, regionKey] of Object.entries(REGION_SURROGATES)) {
    if (isAliasMatch(normalized, alias)) return regionKey;
  }

  return null;
}

function resolveLocalityMatches(locationInput = '') {
  const normalized = normalizeLocationValue(locationInput);
  if (!normalized) return [];
  return localityIndex.filter((entry) => entry.aliases.some((alias) => isAliasMatch(normalized, alias)));
}

function findRegionByKey(regionKey) {
  return GHANA_REGION_DATA.find((region) => region.key === regionKey) || null;
}

function matchesAnyAlias(text, aliases = []) {
  return aliases.some((alias) => text === alias || text.includes(alias) || alias.includes(text));
}

export function validateGhanaLocationPair({ regionInput = '', cityInput = '' } = {}) {
  const normalizedRegion = normalizeLocationValue(regionInput);
  const normalizedCity = normalizeLocationValue(cityInput);

  if (!normalizedRegion && !normalizedCity) {
    return {
      isReady: false,
      isRecognized: false,
      isConsistent: false,
      isValid: false,
      message: '',
      canonicalRegion: '',
      canonicalCity: '',
      regionKey: null,
    };
  }

  if (!normalizedRegion || !normalizedCity) {
    return {
      isReady: false,
      isRecognized: false,
      isConsistent: false,
      isValid: false,
      message: 'Enter both Region and City/Town so the Ghana location can be validated.',
      canonicalRegion: '',
      canonicalCity: '',
      regionKey: null,
    };
  }

  const regionKey = resolveRegionKey(normalizedRegion);
  const localityMatches = resolveLocalityMatches(normalizedCity);

  if (!regionKey || localityMatches.length === 0) {
    return {
      isReady: true,
      isRecognized: false,
      isConsistent: false,
      isValid: false,
      message: 'Please enter a valid Ghana Region and City/Town combination.',
      canonicalRegion: findRegionByKey(regionKey)?.name || '',
      canonicalCity: localityMatches[0]?.name || '',
      regionKey,
    };
  }

  const matchingLocality = localityMatches.find((entry) => entry.regionKey === regionKey) || null;
  if (!matchingLocality) {
    return {
      isReady: true,
      isRecognized: true,
      isConsistent: false,
      isValid: false,
      message: 'Your selected Region and City/Town do not belong together in Ghana. Please correct them before continuing.',
      canonicalRegion: findRegionByKey(regionKey)?.name || '',
      canonicalCity: localityMatches[0]?.name || '',
      regionKey,
    };
  }

  return {
    isReady: true,
    isRecognized: true,
    isConsistent: true,
    isValid: true,
    message: `${findRegionByKey(regionKey)?.name || ''} → ${matchingLocality.name} validated successfully.`,
    canonicalRegion: findRegionByKey(regionKey)?.name || '',
    canonicalCity: matchingLocality.name,
    regionKey,
  };
}

export function detectLocalServiceArea({ regionInput = '', cityInput = '', addressInput = '', landmarkInput = '' } = {}) {
  const validation = validateGhanaLocationPair({ regionInput, cityInput });
  if (!validation.isValid) {
    return { validation, serviceArea: null, serviceAreaLabel: '' };
  }

  const combined = compactLocationText(cityInput, addressInput, landmarkInput, regionInput);

  if (matchesAnyAlias(combined, LOCAL_SERVICE_AREAS.umat)) {
    return { validation, serviceArea: 'umat', serviceAreaLabel: 'UMaT Main Campus' };
  }
  if (matchesAnyAlias(combined, LOCAL_SERVICE_AREAS.accra)) {
    return { validation, serviceArea: 'accra', serviceAreaLabel: 'Accra' };
  }
  if (matchesAnyAlias(combined, LOCAL_SERVICE_AREAS.kumasi)) {
    return { validation, serviceArea: 'kumasi', serviceAreaLabel: 'Kumasi' };
  }
  if (matchesAnyAlias(combined, LOCAL_SERVICE_AREAS.tarkwa)) {
    return { validation, serviceArea: 'tarkwa', serviceAreaLabel: 'Tarkwa' };
  }

  return { validation, serviceArea: 'outside', serviceAreaLabel: 'Outside local service areas' };
}

export function getAllowedDeliveryZoneIds(locationContext = {}) {
  const { validation, serviceArea } = detectLocalServiceArea(locationContext);
  if (!validation.isValid) return [];

  switch (serviceArea) {
    case 'accra':
      return [DELIVERY_ZONE_IDS.ACCRA, DELIVERY_ZONE_IDS.OUTSIDE, DELIVERY_ZONE_IDS.BUS_STATION];
    case 'kumasi':
      return [DELIVERY_ZONE_IDS.KUMASI, DELIVERY_ZONE_IDS.OUTSIDE, DELIVERY_ZONE_IDS.BUS_STATION];
    case 'umat':
      return [DELIVERY_ZONE_IDS.UMAT_DOORSTEP, DELIVERY_ZONE_IDS.TARKWA, DELIVERY_ZONE_IDS.OUTSIDE, DELIVERY_ZONE_IDS.BUS_STATION];
    case 'tarkwa':
      return [DELIVERY_ZONE_IDS.TARKWA, DELIVERY_ZONE_IDS.OUTSIDE, DELIVERY_ZONE_IDS.BUS_STATION];
    default:
      return [DELIVERY_ZONE_IDS.OUTSIDE, DELIVERY_ZONE_IDS.BUS_STATION];
  }
}

export function isTwoStagePaymentEligibleForZone(zoneId, { regionInput = '', cityInput = '', addressInput = '', landmarkInput = '' } = {}) {
  const { validation, serviceArea } = detectLocalServiceArea({ regionInput, cityInput, addressInput, landmarkInput });
  if (!validation.isValid) return false;

  const combined = compactLocationText(cityInput, addressInput, landmarkInput, regionInput);

  if (zoneId === DELIVERY_ZONE_IDS.ACCRA) {
    return serviceArea === 'accra';
  }

  if (zoneId === DELIVERY_ZONE_IDS.KUMASI) {
    return matchesAnyAlias(combined, KUMASI_PAYMENT_ELIGIBLE_AREAS);
  }

  if (zoneId === DELIVERY_ZONE_IDS.UMAT_DOORSTEP) {
    return serviceArea === 'umat';
  }

  if (zoneId === DELIVERY_ZONE_IDS.TARKWA) {
    return serviceArea === 'tarkwa' || serviceArea === 'umat';
  }

  return false;
}

