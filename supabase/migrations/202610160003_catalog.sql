-- Initial catalog and estimated shipping master. Run once after orders migration.
BEGIN;

INSERT INTO
  public.tb_m_product
VALUES
  (
    'base-0-0',
    'TANJ Sand',
    'Cream',
    687000,
    12,
    TRUE
  ),
  (
    'base-0-1',
    'TANJ Noir',
    'Hitam',
    687000,
    15,
    TRUE
  ),
  (
    'base-0-2',
    'TANJ Cocoa',
    'Cokelat',
    687000,
    18,
    TRUE
  ),
  ('base-1-0', 'Cocoa', 'Cokelat', 687000, 21, TRUE),
  ('base-1-1', 'Black', 'Hitam', 687000, 24, TRUE),
  ('base-1-2', 'Ivory', 'Ivory', 687000, 27, TRUE),
  ('base-2-0', 'Cream', 'Cream', 687000, 30, TRUE),
  ('base-2-1', 'Black', 'Hitam', 687000, 33, TRUE),
  ('base-2-2', 'Ash', 'Abu-abu', 687000, 0, FALSE),
  ('base-3-0', 'Cream', 'Cream', 687000, 39, TRUE),
  ('base-3-1', 'Black', 'Hitam', 687000, 42, TRUE),
  ('base-3-2', 'Ash', 'Abu-abu', 687000, 45, TRUE);

INSERT INTO
  public.tb_m_shipping
VALUES
  (
    '11.01',
    '11',
    'Aceh',
    'Kabupaten Aceh Selatan',
    44000
  ),
  (
    '11.02',
    '11',
    'Aceh',
    'Kabupaten Aceh Tenggara',
    44000
  ),
  (
    '11.03',
    '11',
    'Aceh',
    'Kabupaten Aceh Timur',
    44000
  ),
  (
    '11.04',
    '11',
    'Aceh',
    'Kabupaten Aceh Tengah',
    44000
  ),
  (
    '11.05',
    '11',
    'Aceh',
    'Kabupaten Aceh Barat',
    44000
  ),
  (
    '11.06',
    '11',
    'Aceh',
    'Kabupaten Aceh Besar',
    44000
  ),
  ('11.07', '11', 'Aceh', 'Kabupaten Pidie', 44000),
  (
    '11.08',
    '11',
    'Aceh',
    'Kabupaten Aceh Utara',
    44000
  ),
  (
    '11.09',
    '11',
    'Aceh',
    'Kabupaten Simeulue',
    44000
  ),
  (
    '11.10',
    '11',
    'Aceh',
    'Kabupaten Aceh Singkil',
    44000
  ),
  ('11.11', '11', 'Aceh', 'Kabupaten Bireuen', 44000),
  (
    '11.12',
    '11',
    'Aceh',
    'Kabupaten Aceh Barat Daya',
    44000
  ),
  (
    '11.13',
    '11',
    'Aceh',
    'Kabupaten Gayo Lues',
    44000
  ),
  (
    '11.14',
    '11',
    'Aceh',
    'Kabupaten Aceh Jaya',
    44000
  ),
  (
    '11.15',
    '11',
    'Aceh',
    'Kabupaten Nagan Raya',
    44000
  ),
  (
    '11.16',
    '11',
    'Aceh',
    'Kabupaten Aceh Tamiang',
    44000
  ),
  (
    '11.17',
    '11',
    'Aceh',
    'Kabupaten Bener Meriah',
    44000
  ),
  (
    '11.18',
    '11',
    'Aceh',
    'Kabupaten Pidie Jaya',
    44000
  ),
  ('11.71', '11', 'Aceh', 'Kota Banda Aceh', 35000),
  ('11.72', '11', 'Aceh', 'Kota Sabang', 35000),
  ('11.73', '11', 'Aceh', 'Kota Lhokseumawe', 35000),
  ('11.74', '11', 'Aceh', 'Kota Langsa', 35000),
  ('11.75', '11', 'Aceh', 'Kota Subulussalam', 35000),
  (
    '12.01',
    '12',
    'Sumatera Utara',
    'Kabupaten Tapanuli Tengah',
    44000
  ),
  (
    '12.02',
    '12',
    'Sumatera Utara',
    'Kabupaten Tapanuli Utara',
    44000
  ),
  (
    '12.03',
    '12',
    'Sumatera Utara',
    'Kabupaten Tapanuli Selatan',
    44000
  ),
  (
    '12.04',
    '12',
    'Sumatera Utara',
    'Kabupaten Nias',
    53000
  ),
  (
    '12.05',
    '12',
    'Sumatera Utara',
    'Kabupaten Langkat',
    44000
  ),
  (
    '12.06',
    '12',
    'Sumatera Utara',
    'Kabupaten Karo',
    44000
  ),
  (
    '12.07',
    '12',
    'Sumatera Utara',
    'Kabupaten Deli Serdang',
    44000
  ),
  (
    '12.08',
    '12',
    'Sumatera Utara',
    'Kabupaten Simalungun',
    44000
  ),
  (
    '12.09',
    '12',
    'Sumatera Utara',
    'Kabupaten Asahan',
    44000
  ),
  (
    '12.10',
    '12',
    'Sumatera Utara',
    'Kabupaten Labuhanbatu',
    44000
  ),
  (
    '12.11',
    '12',
    'Sumatera Utara',
    'Kabupaten Dairi',
    44000
  ),
  (
    '12.12',
    '12',
    'Sumatera Utara',
    'Kabupaten Toba',
    44000
  ),
  (
    '12.13',
    '12',
    'Sumatera Utara',
    'Kabupaten Mandailing Natal',
    44000
  ),
  (
    '12.14',
    '12',
    'Sumatera Utara',
    'Kabupaten Nias Selatan',
    53000
  ),
  (
    '12.15',
    '12',
    'Sumatera Utara',
    'Kabupaten Pakpak Bharat',
    44000
  ),
  (
    '12.16',
    '12',
    'Sumatera Utara',
    'Kabupaten Humbang Hasundutan',
    44000
  ),
  (
    '12.17',
    '12',
    'Sumatera Utara',
    'Kabupaten Samosir',
    44000
  ),
  (
    '12.18',
    '12',
    'Sumatera Utara',
    'Kabupaten Serdang Bedagai',
    44000
  ),
  (
    '12.19',
    '12',
    'Sumatera Utara',
    'Kabupaten Batu Bara',
    44000
  ),
  (
    '12.20',
    '12',
    'Sumatera Utara',
    'Kabupaten Padang Lawas Utara',
    44000
  ),
  (
    '12.21',
    '12',
    'Sumatera Utara',
    'Kabupaten Padang Lawas',
    44000
  ),
  (
    '12.22',
    '12',
    'Sumatera Utara',
    'Kabupaten Labuhanbatu Selatan',
    44000
  ),
  (
    '12.23',
    '12',
    'Sumatera Utara',
    'Kabupaten Labuhanbatu Utara',
    44000
  ),
  (
    '12.24',
    '12',
    'Sumatera Utara',
    'Kabupaten Nias Utara',
    53000
  ),
  (
    '12.25',
    '12',
    'Sumatera Utara',
    'Kabupaten Nias Barat',
    53000
  ),
  (
    '12.71',
    '12',
    'Sumatera Utara',
    'Kota Medan',
    35000
  ),
  (
    '12.72',
    '12',
    'Sumatera Utara',
    'Kota Pematangsiantar',
    35000
  ),
  (
    '12.73',
    '12',
    'Sumatera Utara',
    'Kota Sibolga',
    35000
  ),
  (
    '12.74',
    '12',
    'Sumatera Utara',
    'Kota Tanjungbalai',
    35000
  ),
  (
    '12.75',
    '12',
    'Sumatera Utara',
    'Kota Binjai',
    35000
  ),
  (
    '12.76',
    '12',
    'Sumatera Utara',
    'Kota Tebing Tinggi',
    35000
  ),
  (
    '12.77',
    '12',
    'Sumatera Utara',
    'Kota Padangsidimpuan',
    35000
  ),
  (
    '12.78',
    '12',
    'Sumatera Utara',
    'Kota Gunungsitoli',
    35000
  ),
  (
    '13.01',
    '13',
    'Sumatera Barat',
    'Kabupaten Pesisir Selatan',
    38000
  ),
  (
    '13.02',
    '13',
    'Sumatera Barat',
    'Kabupaten Solok',
    38000
  ),
  (
    '13.03',
    '13',
    'Sumatera Barat',
    'Kabupaten Sijunjung',
    38000
  ),
  (
    '13.04',
    '13',
    'Sumatera Barat',
    'Kabupaten Tanah Datar',
    38000
  ),
  (
    '13.05',
    '13',
    'Sumatera Barat',
    'Kabupaten Padang Pariaman',
    38000
  ),
  (
    '13.06',
    '13',
    'Sumatera Barat',
    'Kabupaten Agam',
    38000
  ),
  (
    '13.07',
    '13',
    'Sumatera Barat',
    'Kabupaten Lima Puluh Kota',
    38000
  ),
  (
    '13.08',
    '13',
    'Sumatera Barat',
    'Kabupaten Pasaman',
    38000
  ),
  (
    '13.09',
    '13',
    'Sumatera Barat',
    'Kabupaten Kepulauan Mentawai',
    45000
  ),
  (
    '13.10',
    '13',
    'Sumatera Barat',
    'Kabupaten Dharmasraya',
    38000
  ),
  (
    '13.11',
    '13',
    'Sumatera Barat',
    'Kabupaten Solok Selatan',
    38000
  ),
  (
    '13.12',
    '13',
    'Sumatera Barat',
    'Kabupaten Pasaman Barat',
    38000
  ),
  (
    '13.71',
    '13',
    'Sumatera Barat',
    'Kota Padang',
    30000
  ),
  (
    '13.72',
    '13',
    'Sumatera Barat',
    'Kota Solok',
    30000
  ),
  (
    '13.73',
    '13',
    'Sumatera Barat',
    'Kota Sawahlunto',
    30000
  ),
  (
    '13.74',
    '13',
    'Sumatera Barat',
    'Kota Padang Panjang',
    30000
  ),
  (
    '13.75',
    '13',
    'Sumatera Barat',
    'Kota Bukittinggi',
    30000
  ),
  (
    '13.76',
    '13',
    'Sumatera Barat',
    'Kota Payakumbuh',
    30000
  ),
  (
    '13.77',
    '13',
    'Sumatera Barat',
    'Kota Pariaman',
    30000
  ),
  ('14.01', '14', 'Riau', 'Kabupaten Kampar', 38000),
  (
    '14.02',
    '14',
    'Riau',
    'Kabupaten Indragiri Hulu',
    38000
  ),
  (
    '14.03',
    '14',
    'Riau',
    'Kabupaten Bengkalis',
    38000
  ),
  (
    '14.04',
    '14',
    'Riau',
    'Kabupaten Indragiri Hilir',
    38000
  ),
  (
    '14.05',
    '14',
    'Riau',
    'Kabupaten Pelalawan',
    38000
  ),
  (
    '14.06',
    '14',
    'Riau',
    'Kabupaten Rokan Hulu',
    38000
  ),
  (
    '14.07',
    '14',
    'Riau',
    'Kabupaten Rokan Hilir',
    38000
  ),
  ('14.08', '14', 'Riau', 'Kabupaten Siak', 38000),
  (
    '14.09',
    '14',
    'Riau',
    'Kabupaten Kuantan Singingi',
    38000
  ),
  (
    '14.10',
    '14',
    'Riau',
    'Kabupaten Kepulauan Meranti',
    45000
  ),
  ('14.71', '14', 'Riau', 'Kota Pekanbaru', 30000),
  ('14.72', '14', 'Riau', 'Kota Dumai', 30000),
  (
    '15.01',
    '15',
    'Jambi',
    'Kabupaten Kerinci',
    32000
  ),
  (
    '15.02',
    '15',
    'Jambi',
    'Kabupaten Merangin',
    32000
  ),
  (
    '15.03',
    '15',
    'Jambi',
    'Kabupaten Sarolangun',
    32000
  ),
  (
    '15.04',
    '15',
    'Jambi',
    'Kabupaten Batanghari',
    32000
  ),
  (
    '15.05',
    '15',
    'Jambi',
    'Kabupaten Muaro Jambi',
    32000
  ),
  (
    '15.06',
    '15',
    'Jambi',
    'Kabupaten Tanjung Jabung Barat',
    32000
  ),
  (
    '15.07',
    '15',
    'Jambi',
    'Kabupaten Tanjung Jabung Timur',
    32000
  ),
  ('15.08', '15', 'Jambi', 'Kabupaten Bungo', 32000),
  ('15.09', '15', 'Jambi', 'Kabupaten Tebo', 32000),
  ('15.71', '15', 'Jambi', 'Kota Jambi', 25000),
  (
    '15.72',
    '15',
    'Jambi',
    'Kota Sungai Penuh',
    25000
  ),
  (
    '16.01',
    '16',
    'Sumatera Selatan',
    'Kabupaten Ogan Komering Ulu',
    29000
  ),
  (
    '16.02',
    '16',
    'Sumatera Selatan',
    'Kabupaten Ogan Komering Ilir',
    29000
  ),
  (
    '16.03',
    '16',
    'Sumatera Selatan',
    'Kabupaten Muara Enim',
    29000
  ),
  (
    '16.04',
    '16',
    'Sumatera Selatan',
    'Kabupaten Lahat',
    29000
  ),
  (
    '16.05',
    '16',
    'Sumatera Selatan',
    'Kabupaten Musi Rawas',
    29000
  ),
  (
    '16.06',
    '16',
    'Sumatera Selatan',
    'Kabupaten Musi Banyuasin',
    29000
  ),
  (
    '16.07',
    '16',
    'Sumatera Selatan',
    'Kabupaten Banyuasin',
    29000
  ),
  (
    '16.08',
    '16',
    'Sumatera Selatan',
    'Kabupaten Ogan Komering Ulu Timur',
    29000
  ),
  (
    '16.09',
    '16',
    'Sumatera Selatan',
    'Kabupaten Ogan Komering Ulu Selatan',
    29000
  ),
  (
    '16.10',
    '16',
    'Sumatera Selatan',
    'Kabupaten Ogan Ilir',
    29000
  ),
  (
    '16.11',
    '16',
    'Sumatera Selatan',
    'Kabupaten Empat Lawang',
    29000
  ),
  (
    '16.12',
    '16',
    'Sumatera Selatan',
    'Kabupaten Penukal Abab Lematang Ilir',
    29000
  ),
  (
    '16.13',
    '16',
    'Sumatera Selatan',
    'Kabupaten Musi Rawas Utara',
    29000
  ),
  (
    '16.71',
    '16',
    'Sumatera Selatan',
    'Kota Palembang',
    23000
  ),
  (
    '16.72',
    '16',
    'Sumatera Selatan',
    'Kota Pagar Alam',
    23000
  ),
  (
    '16.73',
    '16',
    'Sumatera Selatan',
    'Kota Lubuk Linggau',
    23000
  ),
  (
    '16.74',
    '16',
    'Sumatera Selatan',
    'Kota Prabumulih',
    23000
  ),
  (
    '17.01',
    '17',
    'Bengkulu',
    'Kabupaten Bengkulu Selatan',
    35000
  ),
  (
    '17.02',
    '17',
    'Bengkulu',
    'Kabupaten Rejang Lebong',
    35000
  ),
  (
    '17.03',
    '17',
    'Bengkulu',
    'Kabupaten Bengkulu Utara',
    35000
  ),
  (
    '17.04',
    '17',
    'Bengkulu',
    'Kabupaten Kaur',
    35000
  ),
  (
    '17.05',
    '17',
    'Bengkulu',
    'Kabupaten Seluma',
    35000
  ),
  (
    '17.06',
    '17',
    'Bengkulu',
    'Kabupaten Mukomuko',
    35000
  ),
  (
    '17.07',
    '17',
    'Bengkulu',
    'Kabupaten Lebong',
    35000
  ),
  (
    '17.08',
    '17',
    'Bengkulu',
    'Kabupaten Kepahiang',
    35000
  ),
  (
    '17.09',
    '17',
    'Bengkulu',
    'Kabupaten Bengkulu Tengah',
    35000
  ),
  ('17.71', '17', 'Bengkulu', 'Kota Bengkulu', 28000),
  (
    '18.01',
    '18',
    'Lampung',
    'Kabupaten Lampung Selatan',
    23000
  ),
  (
    '18.02',
    '18',
    'Lampung',
    'Kabupaten Lampung Tengah',
    23000
  ),
  (
    '18.03',
    '18',
    'Lampung',
    'Kabupaten Lampung Utara',
    23000
  ),
  (
    '18.04',
    '18',
    'Lampung',
    'Kabupaten Lampung Barat',
    23000
  ),
  (
    '18.05',
    '18',
    'Lampung',
    'Kabupaten Tulang Bawang',
    23000
  ),
  (
    '18.06',
    '18',
    'Lampung',
    'Kabupaten Tanggamus',
    23000
  ),
  (
    '18.07',
    '18',
    'Lampung',
    'Kabupaten Lampung Timur',
    23000
  ),
  (
    '18.08',
    '18',
    'Lampung',
    'Kabupaten Way Kanan',
    23000
  ),
  (
    '18.09',
    '18',
    'Lampung',
    'Kabupaten Pesawaran',
    23000
  ),
  (
    '18.10',
    '18',
    'Lampung',
    'Kabupaten Pringsewu',
    23000
  ),
  (
    '18.11',
    '18',
    'Lampung',
    'Kabupaten Mesuji',
    23000
  ),
  (
    '18.12',
    '18',
    'Lampung',
    'Kabupaten Tulang Bawang Barat',
    23000
  ),
  (
    '18.13',
    '18',
    'Lampung',
    'Kabupaten Pesisir Barat',
    23000
  ),
  (
    '18.71',
    '18',
    'Lampung',
    'Kota Bandar Lampung',
    18000
  ),
  ('18.72', '18', 'Lampung', 'Kota Metro', 18000),
  (
    '19.01',
    '19',
    'Kepulauan Bangka Belitung',
    'Kabupaten Bangka',
    38000
  ),
  (
    '19.02',
    '19',
    'Kepulauan Bangka Belitung',
    'Kabupaten Belitung',
    38000
  ),
  (
    '19.03',
    '19',
    'Kepulauan Bangka Belitung',
    'Kabupaten Bangka Selatan',
    38000
  ),
  (
    '19.04',
    '19',
    'Kepulauan Bangka Belitung',
    'Kabupaten Bangka Tengah',
    38000
  ),
  (
    '19.05',
    '19',
    'Kepulauan Bangka Belitung',
    'Kabupaten Bangka Barat',
    38000
  ),
  (
    '19.06',
    '19',
    'Kepulauan Bangka Belitung',
    'Kabupaten Belitung Timur',
    38000
  ),
  (
    '19.71',
    '19',
    'Kepulauan Bangka Belitung',
    'Kota Pangkal Pinang',
    30000
  ),
  (
    '21.01',
    '21',
    'Kepulauan Riau',
    'Kabupaten Bintan',
    44000
  ),
  (
    '21.02',
    '21',
    'Kepulauan Riau',
    'Kabupaten Karimun',
    44000
  ),
  (
    '21.03',
    '21',
    'Kepulauan Riau',
    'Kabupaten Natuna',
    53000
  ),
  (
    '21.04',
    '21',
    'Kepulauan Riau',
    'Kabupaten Lingga',
    44000
  ),
  (
    '21.05',
    '21',
    'Kepulauan Riau',
    'Kabupaten Kepulauan Anambas',
    53000
  ),
  (
    '21.71',
    '21',
    'Kepulauan Riau',
    'Kota Batam',
    35000
  ),
  (
    '21.72',
    '21',
    'Kepulauan Riau',
    'Kota Tanjung Pinang',
    35000
  ),
  (
    '31.01',
    '31',
    'Daerah Khusus Ibukota Jakarta',
    'Kabupaten Administrasi Kepulauan Seribu',
    24000
  ),
  (
    '31.71',
    '31',
    'Daerah Khusus Ibukota Jakarta',
    'Kota Administrasi Jakarta Pusat',
    8000
  ),
  (
    '31.72',
    '31',
    'Daerah Khusus Ibukota Jakarta',
    'Kota Administrasi Jakarta Utara ',
    8000
  ),
  (
    '31.73',
    '31',
    'Daerah Khusus Ibukota Jakarta',
    'Kota Administrasi Jakarta Barat',
    8000
  ),
  (
    '31.74',
    '31',
    'Daerah Khusus Ibukota Jakarta',
    'Kota Administrasi Jakarta Selatan',
    8000
  ),
  (
    '31.75',
    '31',
    'Daerah Khusus Ibukota Jakarta',
    'Kota Administrasi Jakarta Timur',
    8000
  ),
  (
    '32.01',
    '32',
    'Jawa Barat',
    'Kabupaten Bogor',
    10000
  ),
  (
    '32.02',
    '32',
    'Jawa Barat',
    'Kabupaten Sukabumi',
    13000
  ),
  (
    '32.03',
    '32',
    'Jawa Barat',
    'Kabupaten Cianjur',
    13000
  ),
  (
    '32.04',
    '32',
    'Jawa Barat',
    'Kabupaten Bandung',
    10000
  ),
  (
    '32.05',
    '32',
    'Jawa Barat',
    'Kabupaten Garut',
    13000
  ),
  (
    '32.06',
    '32',
    'Jawa Barat',
    'Kabupaten Tasikmalaya',
    13000
  ),
  (
    '32.07',
    '32',
    'Jawa Barat',
    'Kabupaten Ciamis',
    13000
  ),
  (
    '32.08',
    '32',
    'Jawa Barat',
    'Kabupaten Kuningan',
    13000
  ),
  (
    '32.09',
    '32',
    'Jawa Barat',
    'Kabupaten Cirebon',
    13000
  ),
  (
    '32.10',
    '32',
    'Jawa Barat',
    'Kabupaten Majalengka',
    13000
  ),
  (
    '32.11',
    '32',
    'Jawa Barat',
    'Kabupaten Sumedang',
    13000
  ),
  (
    '32.12',
    '32',
    'Jawa Barat',
    'Kabupaten Indramayu',
    13000
  ),
  (
    '32.13',
    '32',
    'Jawa Barat',
    'Kabupaten Subang',
    13000
  ),
  (
    '32.14',
    '32',
    'Jawa Barat',
    'Kabupaten Purwakarta',
    13000
  ),
  (
    '32.15',
    '32',
    'Jawa Barat',
    'Kabupaten Karawang',
    13000
  ),
  (
    '32.16',
    '32',
    'Jawa Barat',
    'Kabupaten Bekasi',
    10000
  ),
  (
    '32.17',
    '32',
    'Jawa Barat',
    'Kabupaten Bandung Barat',
    13000
  ),
  (
    '32.18',
    '32',
    'Jawa Barat',
    'Kabupaten Pangandaran',
    13000
  ),
  ('32.71', '32', 'Jawa Barat', 'Kota Bogor', 10000),
  (
    '32.72',
    '32',
    'Jawa Barat',
    'Kota Sukabumi',
    10000
  ),
  (
    '32.73',
    '32',
    'Jawa Barat',
    'Kota Bandung',
    10000
  ),
  (
    '32.74',
    '32',
    'Jawa Barat',
    'Kota Cirebon',
    10000
  ),
  ('32.75', '32', 'Jawa Barat', 'Kota Bekasi', 10000),
  ('32.76', '32', 'Jawa Barat', 'Kota Depok', 10000),
  ('32.77', '32', 'Jawa Barat', 'Kota Cimahi', 10000),
  (
    '32.78',
    '32',
    'Jawa Barat',
    'Kota Tasikmalaya',
    10000
  ),
  ('32.79', '32', 'Jawa Barat', 'Kota Banjar', 10000),
  (
    '33.01',
    '33',
    'Jawa Tengah',
    'Kabupaten Cilacap',
    23000
  ),
  (
    '33.02',
    '33',
    'Jawa Tengah',
    'Kabupaten Banyumas',
    23000
  ),
  (
    '33.03',
    '33',
    'Jawa Tengah',
    'Kabupaten Purbalingga',
    23000
  ),
  (
    '33.04',
    '33',
    'Jawa Tengah',
    'Kabupaten Banjarnegara',
    23000
  ),
  (
    '33.05',
    '33',
    'Jawa Tengah',
    'Kabupaten Kebumen',
    23000
  ),
  (
    '33.06',
    '33',
    'Jawa Tengah',
    'Kabupaten Purworejo',
    23000
  ),
  (
    '33.07',
    '33',
    'Jawa Tengah',
    'Kabupaten Wonosobo',
    23000
  ),
  (
    '33.08',
    '33',
    'Jawa Tengah',
    'Kabupaten Magelang',
    23000
  ),
  (
    '33.09',
    '33',
    'Jawa Tengah',
    'Kabupaten Boyolali',
    23000
  ),
  (
    '33.10',
    '33',
    'Jawa Tengah',
    'Kabupaten Klaten',
    23000
  ),
  (
    '33.11',
    '33',
    'Jawa Tengah',
    'Kabupaten Sukoharjo',
    23000
  ),
  (
    '33.12',
    '33',
    'Jawa Tengah',
    'Kabupaten Wonogiri',
    23000
  ),
  (
    '33.13',
    '33',
    'Jawa Tengah',
    'Kabupaten Karanganyar',
    23000
  ),
  (
    '33.14',
    '33',
    'Jawa Tengah',
    'Kabupaten Sragen',
    23000
  ),
  (
    '33.15',
    '33',
    'Jawa Tengah',
    'Kabupaten Grobogan',
    23000
  ),
  (
    '33.16',
    '33',
    'Jawa Tengah',
    'Kabupaten Blora',
    23000
  ),
  (
    '33.17',
    '33',
    'Jawa Tengah',
    'Kabupaten Rembang',
    23000
  ),
  (
    '33.18',
    '33',
    'Jawa Tengah',
    'Kabupaten Pati',
    23000
  ),
  (
    '33.19',
    '33',
    'Jawa Tengah',
    'Kabupaten Kudus',
    23000
  ),
  (
    '33.20',
    '33',
    'Jawa Tengah',
    'Kabupaten Jepara',
    23000
  ),
  (
    '33.21',
    '33',
    'Jawa Tengah',
    'Kabupaten Demak',
    23000
  ),
  (
    '33.22',
    '33',
    'Jawa Tengah',
    'Kabupaten Semarang',
    23000
  ),
  (
    '33.23',
    '33',
    'Jawa Tengah',
    'Kabupaten Temanggung',
    23000
  ),
  (
    '33.24',
    '33',
    'Jawa Tengah',
    'Kabupaten Kendal',
    23000
  ),
  (
    '33.25',
    '33',
    'Jawa Tengah',
    'Kabupaten Batang',
    23000
  ),
  (
    '33.26',
    '33',
    'Jawa Tengah',
    'Kabupaten Pekalongan',
    23000
  ),
  (
    '33.27',
    '33',
    'Jawa Tengah',
    'Kabupaten Pemalang',
    23000
  ),
  (
    '33.28',
    '33',
    'Jawa Tengah',
    'Kabupaten Tegal',
    23000
  ),
  (
    '33.29',
    '33',
    'Jawa Tengah',
    'Kabupaten Brebes',
    23000
  ),
  (
    '33.71',
    '33',
    'Jawa Tengah',
    'Kota Magelang',
    18000
  ),
  (
    '33.72',
    '33',
    'Jawa Tengah',
    'Kota Surakarta',
    18000
  ),
  (
    '33.73',
    '33',
    'Jawa Tengah',
    'Kota Salatiga',
    18000
  ),
  (
    '33.74',
    '33',
    'Jawa Tengah',
    'Kota Semarang',
    18000
  ),
  (
    '33.75',
    '33',
    'Jawa Tengah',
    'Kota Pekalongan',
    18000
  ),
  ('33.76', '33', 'Jawa Tengah', 'Kota Tegal', 18000),
  (
    '34.01',
    '34',
    'Daerah Istimewa Yogyakarta',
    'Kabupaten Kulon Progo',
    23000
  ),
  (
    '34.02',
    '34',
    'Daerah Istimewa Yogyakarta',
    'Kabupaten Bantul',
    23000
  ),
  (
    '34.03',
    '34',
    'Daerah Istimewa Yogyakarta',
    'Kabupaten Gunungkidul',
    23000
  ),
  (
    '34.04',
    '34',
    'Daerah Istimewa Yogyakarta',
    'Kabupaten Sleman',
    23000
  ),
  (
    '34.71',
    '34',
    'Daerah Istimewa Yogyakarta',
    'Kota Yogyakarta',
    18000
  ),
  (
    '35.01',
    '35',
    'Jawa Timur',
    'Kabupaten Pacitan',
    25000
  ),
  (
    '35.02',
    '35',
    'Jawa Timur',
    'Kabupaten Ponorogo',
    25000
  ),
  (
    '35.03',
    '35',
    'Jawa Timur',
    'Kabupaten Trenggalek',
    25000
  ),
  (
    '35.04',
    '35',
    'Jawa Timur',
    'Kabupaten Tulungagung',
    25000
  ),
  (
    '35.05',
    '35',
    'Jawa Timur',
    'Kabupaten Blitar',
    25000
  ),
  (
    '35.06',
    '35',
    'Jawa Timur',
    'Kabupaten Kediri',
    25000
  ),
  (
    '35.07',
    '35',
    'Jawa Timur',
    'Kabupaten Malang',
    25000
  ),
  (
    '35.08',
    '35',
    'Jawa Timur',
    'Kabupaten Lumajang',
    25000
  ),
  (
    '35.09',
    '35',
    'Jawa Timur',
    'Kabupaten Jember',
    25000
  ),
  (
    '35.10',
    '35',
    'Jawa Timur',
    'Kabupaten Banyuwangi',
    25000
  ),
  (
    '35.11',
    '35',
    'Jawa Timur',
    'Kabupaten Bondowoso',
    25000
  ),
  (
    '35.12',
    '35',
    'Jawa Timur',
    'Kabupaten Situbondo',
    25000
  ),
  (
    '35.13',
    '35',
    'Jawa Timur',
    'Kabupaten Probolinggo',
    25000
  ),
  (
    '35.14',
    '35',
    'Jawa Timur',
    'Kabupaten Pasuruan',
    25000
  ),
  (
    '35.15',
    '35',
    'Jawa Timur',
    'Kabupaten Sidoarjo',
    25000
  ),
  (
    '35.16',
    '35',
    'Jawa Timur',
    'Kabupaten Mojokerto',
    25000
  ),
  (
    '35.17',
    '35',
    'Jawa Timur',
    'Kabupaten Jombang',
    25000
  ),
  (
    '35.18',
    '35',
    'Jawa Timur',
    'Kabupaten Nganjuk',
    25000
  ),
  (
    '35.19',
    '35',
    'Jawa Timur',
    'Kabupaten Madiun',
    25000
  ),
  (
    '35.20',
    '35',
    'Jawa Timur',
    'Kabupaten Magetan',
    25000
  ),
  (
    '35.21',
    '35',
    'Jawa Timur',
    'Kabupaten Ngawi',
    25000
  ),
  (
    '35.22',
    '35',
    'Jawa Timur',
    'Kabupaten Bojonegoro',
    25000
  ),
  (
    '35.23',
    '35',
    'Jawa Timur',
    'Kabupaten Tuban',
    25000
  ),
  (
    '35.24',
    '35',
    'Jawa Timur',
    'Kabupaten Lamongan',
    25000
  ),
  (
    '35.25',
    '35',
    'Jawa Timur',
    'Kabupaten Gresik',
    25000
  ),
  (
    '35.26',
    '35',
    'Jawa Timur',
    'Kabupaten Bangkalan',
    25000
  ),
  (
    '35.27',
    '35',
    'Jawa Timur',
    'Kabupaten Sampang',
    25000
  ),
  (
    '35.28',
    '35',
    'Jawa Timur',
    'Kabupaten Pamekasan',
    25000
  ),
  (
    '35.29',
    '35',
    'Jawa Timur',
    'Kabupaten Sumenep',
    25000
  ),
  ('35.71', '35', 'Jawa Timur', 'Kota Kediri', 20000),
  ('35.72', '35', 'Jawa Timur', 'Kota Blitar', 20000),
  ('35.73', '35', 'Jawa Timur', 'Kota Malang', 20000),
  (
    '35.74',
    '35',
    'Jawa Timur',
    'Kota Probolinggo',
    20000
  ),
  (
    '35.75',
    '35',
    'Jawa Timur',
    'Kota Pasuruan',
    20000
  ),
  (
    '35.76',
    '35',
    'Jawa Timur',
    'Kota Mojokerto',
    20000
  ),
  ('35.77', '35', 'Jawa Timur', 'Kota Madiun', 20000),
  (
    '35.78',
    '35',
    'Jawa Timur',
    'Kota Surabaya',
    20000
  ),
  ('35.79', '35', 'Jawa Timur', 'Kota Batu', 20000),
  (
    '36.01',
    '36',
    'Banten',
    'Kabupaten Pandeglang',
    13000
  ),
  ('36.02', '36', 'Banten', 'Kabupaten Lebak', 13000),
  (
    '36.03',
    '36',
    'Banten',
    'Kabupaten Tangerang',
    10000
  ),
  (
    '36.04',
    '36',
    'Banten',
    'Kabupaten Serang',
    13000
  ),
  ('36.71', '36', 'Banten', 'Kota Tangerang', 10000),
  ('36.72', '36', 'Banten', 'Kota Cilegon', 10000),
  ('36.73', '36', 'Banten', 'Kota Serang', 10000),
  (
    '36.74',
    '36',
    'Banten',
    'Kota Tangerang Selatan',
    10000
  ),
  (
    '51.01',
    '51',
    'Bali',
    'Kabupaten Jembrana',
    32000
  ),
  ('51.02', '51', 'Bali', 'Kabupaten Tabanan', 32000),
  ('51.03', '51', 'Bali', 'Kabupaten Badung', 32000),
  ('51.04', '51', 'Bali', 'Kabupaten Gianyar', 32000),
  (
    '51.05',
    '51',
    'Bali',
    'Kabupaten Klungkung',
    32000
  ),
  ('51.06', '51', 'Bali', 'Kabupaten Bangli', 32000),
  (
    '51.07',
    '51',
    'Bali',
    'Kabupaten Karangasem',
    32000
  ),
  (
    '51.08',
    '51',
    'Bali',
    'Kabupaten Buleleng',
    32000
  ),
  ('51.71', '51', 'Bali', 'Kota Denpasar', 25000),
  (
    '52.01',
    '52',
    'Nusa Tenggara Barat',
    'Kabupaten Lombok Barat',
    44000
  ),
  (
    '52.02',
    '52',
    'Nusa Tenggara Barat',
    'Kabupaten Lombok Tengah',
    44000
  ),
  (
    '52.03',
    '52',
    'Nusa Tenggara Barat',
    'Kabupaten Lombok Timur',
    44000
  ),
  (
    '52.04',
    '52',
    'Nusa Tenggara Barat',
    'Kabupaten Sumbawa',
    44000
  ),
  (
    '52.05',
    '52',
    'Nusa Tenggara Barat',
    'Kabupaten Dompu',
    44000
  ),
  (
    '52.06',
    '52',
    'Nusa Tenggara Barat',
    'Kabupaten Bima',
    44000
  ),
  (
    '52.07',
    '52',
    'Nusa Tenggara Barat',
    'Kabupaten Sumbawa Barat',
    44000
  ),
  (
    '52.08',
    '52',
    'Nusa Tenggara Barat',
    'Kabupaten Lombok Utara',
    44000
  ),
  (
    '52.71',
    '52',
    'Nusa Tenggara Barat',
    'Kota Mataram',
    35000
  ),
  (
    '52.72',
    '52',
    'Nusa Tenggara Barat',
    'Kota Bima',
    35000
  ),
  (
    '53.01',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Kupang',
    57000
  ),
  (
    '53.02',
    '53',
    'Nusa Tenggara Timur',
    'Kab Timor Tengah Selatan',
    57000
  ),
  (
    '53.03',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Timor Tengah Utara',
    57000
  ),
  (
    '53.04',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Belu',
    57000
  ),
  (
    '53.05',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Alor',
    57000
  ),
  (
    '53.06',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Flores Timur',
    57000
  ),
  (
    '53.07',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Sikka',
    57000
  ),
  (
    '53.08',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Ende',
    57000
  ),
  (
    '53.09',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Ngada',
    57000
  ),
  (
    '53.10',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Manggarai',
    57000
  ),
  (
    '53.11',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Sumba Timur',
    57000
  ),
  (
    '53.12',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Sumba Barat',
    57000
  ),
  (
    '53.13',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Lembata',
    57000
  ),
  (
    '53.14',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Rote Ndao',
    57000
  ),
  (
    '53.15',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Manggarai Barat',
    57000
  ),
  (
    '53.16',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Nagekeo',
    57000
  ),
  (
    '53.17',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Sumba Tengah',
    57000
  ),
  (
    '53.18',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Sumba Barat Daya',
    57000
  ),
  (
    '53.19',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Manggarai Timur',
    57000
  ),
  (
    '53.20',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Sabu Raijua',
    57000
  ),
  (
    '53.21',
    '53',
    'Nusa Tenggara Timur',
    'Kabupaten Malaka',
    57000
  ),
  (
    '53.71',
    '53',
    'Nusa Tenggara Timur',
    'Kota Kupang',
    45000
  ),
  (
    '61.01',
    '61',
    'Kalimantan Barat',
    'Kabupaten Sambas',
    50000
  ),
  (
    '61.02',
    '61',
    'Kalimantan Barat',
    'Kabupaten Mempawah',
    50000
  ),
  (
    '61.03',
    '61',
    'Kalimantan Barat',
    'Kabupaten Sanggau',
    50000
  ),
  (
    '61.04',
    '61',
    'Kalimantan Barat',
    'Kabupaten Ketapang',
    50000
  ),
  (
    '61.05',
    '61',
    'Kalimantan Barat',
    'Kabupaten Sintang',
    50000
  ),
  (
    '61.06',
    '61',
    'Kalimantan Barat',
    'Kabupaten Kapuas Hulu',
    50000
  ),
  (
    '61.07',
    '61',
    'Kalimantan Barat',
    'Kabupaten Bengkayang',
    50000
  ),
  (
    '61.08',
    '61',
    'Kalimantan Barat',
    'Kabupaten Landak',
    50000
  ),
  (
    '61.09',
    '61',
    'Kalimantan Barat',
    'Kabupaten Sekadau',
    50000
  ),
  (
    '61.10',
    '61',
    'Kalimantan Barat',
    'Kabupaten Melawi',
    50000
  ),
  (
    '61.11',
    '61',
    'Kalimantan Barat',
    'Kabupaten Kayong Utara',
    50000
  ),
  (
    '61.12',
    '61',
    'Kalimantan Barat',
    'Kabupaten Kubu Raya',
    50000
  ),
  (
    '61.71',
    '61',
    'Kalimantan Barat',
    'Kota Pontianak',
    40000
  ),
  (
    '61.72',
    '61',
    'Kalimantan Barat',
    'Kota Singkawang',
    40000
  ),
  (
    '62.01',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Kotawaringin Barat',
    50000
  ),
  (
    '62.02',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Kotawaringin Timur',
    50000
  ),
  (
    '62.03',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Kapuas',
    50000
  ),
  (
    '62.04',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Barito Selatan',
    50000
  ),
  (
    '62.05',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Barito Utara',
    50000
  ),
  (
    '62.06',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Katingan',
    50000
  ),
  (
    '62.07',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Seruyan',
    50000
  ),
  (
    '62.08',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Sukamara',
    50000
  ),
  (
    '62.09',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Lamandau',
    50000
  ),
  (
    '62.10',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Gunung Mas',
    50000
  ),
  (
    '62.11',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Pulang Pisau',
    50000
  ),
  (
    '62.12',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Murung Raya',
    50000
  ),
  (
    '62.13',
    '62',
    'Kalimantan Tengah',
    'Kabupaten Barito Timur',
    50000
  ),
  (
    '62.71',
    '62',
    'Kalimantan Tengah',
    'Kota Palangkaraya',
    40000
  ),
  (
    '63.01',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Tanah Laut',
    44000
  ),
  (
    '63.02',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Kotabaru',
    44000
  ),
  (
    '63.03',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Banjar',
    44000
  ),
  (
    '63.04',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Barito Kuala',
    44000
  ),
  (
    '63.05',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Tapin',
    44000
  ),
  (
    '63.06',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Hulu Sungai Selatan',
    44000
  ),
  (
    '63.07',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Hulu Sungai Tengah',
    44000
  ),
  (
    '63.08',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Hulu Sungai Utara',
    44000
  ),
  (
    '63.09',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Tabalong',
    44000
  ),
  (
    '63.10',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Tanah Bumbu',
    44000
  ),
  (
    '63.11',
    '63',
    'Kalimantan Selatan',
    'Kabupaten Balangan',
    44000
  ),
  (
    '63.71',
    '63',
    'Kalimantan Selatan',
    'Kota Banjarmasin',
    35000
  ),
  (
    '63.72',
    '63',
    'Kalimantan Selatan',
    'Kota Banjarbaru',
    35000
  ),
  (
    '64.01',
    '64',
    'Kalimantan Timur',
    'Kabupaten Paser',
    50000
  ),
  (
    '64.02',
    '64',
    'Kalimantan Timur',
    'Kabupaten Kutai Kartanegara',
    50000
  ),
  (
    '64.03',
    '64',
    'Kalimantan Timur',
    'Kabupaten Berau',
    50000
  ),
  (
    '64.07',
    '64',
    'Kalimantan Timur',
    'Kabupaten Kutai Barat',
    50000
  ),
  (
    '64.08',
    '64',
    'Kalimantan Timur',
    'Kabupaten Kutai Timur',
    50000
  ),
  (
    '64.09',
    '64',
    'Kalimantan Timur',
    'Kabupaten Penajam Paser Utara',
    50000
  ),
  (
    '64.11',
    '64',
    'Kalimantan Timur',
    'Kabupaten Mahakam Ulu',
    50000
  ),
  (
    '64.71',
    '64',
    'Kalimantan Timur',
    'Kota Balikpapan',
    40000
  ),
  (
    '64.72',
    '64',
    'Kalimantan Timur',
    'Kota Samarinda',
    40000
  ),
  (
    '64.74',
    '64',
    'Kalimantan Timur',
    'Kota Bontang',
    40000
  ),
  (
    '65.01',
    '65',
    'Kalimantan Utara',
    'Kabupaten Bulungan',
    63000
  ),
  (
    '65.02',
    '65',
    'Kalimantan Utara',
    'Kabupaten Malinau',
    63000
  ),
  (
    '65.03',
    '65',
    'Kalimantan Utara',
    'Kabupaten Nunukan',
    63000
  ),
  (
    '65.04',
    '65',
    'Kalimantan Utara',
    'Kabupaten Tana Tidung',
    63000
  ),
  (
    '65.71',
    '65',
    'Kalimantan Utara',
    'Kota Tarakan',
    50000
  ),
  (
    '71.01',
    '71',
    'Sulawesi Utara',
    'Kabupaten Bolaang Mongondow',
    63000
  ),
  (
    '71.02',
    '71',
    'Sulawesi Utara',
    'Kabupaten Minahasa',
    63000
  ),
  (
    '71.03',
    '71',
    'Sulawesi Utara',
    'Kabupaten Kepulauan Sangihe',
    75000
  ),
  (
    '71.04',
    '71',
    'Sulawesi Utara',
    'Kabupaten Kepulauan Talaud',
    75000
  ),
  (
    '71.05',
    '71',
    'Sulawesi Utara',
    'Kabupaten Minahasa Selatan',
    63000
  ),
  (
    '71.06',
    '71',
    'Sulawesi Utara',
    'Kabupaten Minahasa Utara',
    63000
  ),
  (
    '71.07',
    '71',
    'Sulawesi Utara',
    'Kabupaten Minahasa Tenggara',
    63000
  ),
  (
    '71.08',
    '71',
    'Sulawesi Utara',
    'Kabupaten Bolaang Mongondow Utara',
    63000
  ),
  (
    '71.09',
    '71',
    'Sulawesi Utara',
    'Kabupaten Kep. Siau Tagulandang Biaro',
    63000
  ),
  (
    '71.10',
    '71',
    'Sulawesi Utara',
    'Kabupaten Bolaang Mongondow Timur',
    63000
  ),
  (
    '71.11',
    '71',
    'Sulawesi Utara',
    'Kabupaten Bolaang Mongondow Selatan',
    63000
  ),
  (
    '71.71',
    '71',
    'Sulawesi Utara',
    'Kota Manado',
    50000
  ),
  (
    '71.72',
    '71',
    'Sulawesi Utara',
    'Kota Bitung',
    50000
  ),
  (
    '71.73',
    '71',
    'Sulawesi Utara',
    'Kota Tomohon',
    50000
  ),
  (
    '71.74',
    '71',
    'Sulawesi Utara',
    'Kota Kotamobagu',
    50000
  ),
  (
    '72.01',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Banggai',
    63000
  ),
  (
    '72.02',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Poso',
    63000
  ),
  (
    '72.03',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Donggala',
    63000
  ),
  (
    '72.04',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Toli-Toli',
    63000
  ),
  (
    '72.05',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Buol',
    63000
  ),
  (
    '72.06',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Morowali',
    63000
  ),
  (
    '72.07',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Banggai Kepulauan',
    75000
  ),
  (
    '72.08',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Parigi Moutong',
    63000
  ),
  (
    '72.09',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Tojo Una Una',
    63000
  ),
  (
    '72.10',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Sigi',
    63000
  ),
  (
    '72.11',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Banggai Laut',
    63000
  ),
  (
    '72.12',
    '72',
    'Sulawesi Tengah',
    'Kabupaten Morowali Utara',
    63000
  ),
  (
    '72.71',
    '72',
    'Sulawesi Tengah',
    'Kota Palu',
    50000
  ),
  (
    '73.01',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Kepulauan Selayar',
    68000
  ),
  (
    '73.02',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Bulukumba',
    57000
  ),
  (
    '73.03',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Bantaeng',
    57000
  ),
  (
    '73.04',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Jeneponto',
    57000
  ),
  (
    '73.05',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Takalar',
    57000
  ),
  (
    '73.06',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Gowa',
    57000
  ),
  (
    '73.07',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Sinjai',
    57000
  ),
  (
    '73.08',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Bone',
    57000
  ),
  (
    '73.09',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Maros',
    57000
  ),
  (
    '73.10',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Pangkajene dan Kepulauan',
    68000
  ),
  (
    '73.11',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Barru',
    57000
  ),
  (
    '73.12',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Soppeng',
    57000
  ),
  (
    '73.13',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Wajo',
    57000
  ),
  (
    '73.14',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Sidenreng Rappang',
    57000
  ),
  (
    '73.15',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Pinrang',
    57000
  ),
  (
    '73.16',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Enrekang',
    57000
  ),
  (
    '73.17',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Luwu',
    57000
  ),
  (
    '73.18',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Tana Toraja',
    57000
  ),
  (
    '73.22',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Luwu Utara',
    57000
  ),
  (
    '73.24',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Luwu Timur',
    57000
  ),
  (
    '73.26',
    '73',
    'Sulawesi Selatan',
    'Kabupaten Toraja Utara',
    57000
  ),
  (
    '73.71',
    '73',
    'Sulawesi Selatan',
    'Kota Makassar',
    45000
  ),
  (
    '73.72',
    '73',
    'Sulawesi Selatan',
    'Kota Parepare',
    45000
  ),
  (
    '73.73',
    '73',
    'Sulawesi Selatan',
    'Kota Palopo',
    45000
  ),
  (
    '74.01',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Kolaka',
    63000
  ),
  (
    '74.02',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Konawe',
    63000
  ),
  (
    '74.03',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Muna',
    63000
  ),
  (
    '74.04',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Buton',
    63000
  ),
  (
    '74.05',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Konawe Selatan',
    63000
  ),
  (
    '74.06',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Bombana',
    63000
  ),
  (
    '74.07',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Wakatobi',
    63000
  ),
  (
    '74.08',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Kolaka Utara',
    63000
  ),
  (
    '74.09',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Konawe Utara',
    63000
  ),
  (
    '74.10',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Buton Utara',
    63000
  ),
  (
    '74.11',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Kolaka Timur',
    63000
  ),
  (
    '74.12',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Konawe Kepulauan',
    75000
  ),
  (
    '74.13',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Muna Barat',
    63000
  ),
  (
    '74.14',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Buton Tengah',
    63000
  ),
  (
    '74.15',
    '74',
    'Sulawesi Tenggara',
    'Kabupaten Buton Selatan',
    63000
  ),
  (
    '74.71',
    '74',
    'Sulawesi Tenggara',
    'Kota Kendari',
    50000
  ),
  (
    '74.72',
    '74',
    'Sulawesi Tenggara',
    'Kota Bau Bau',
    50000
  ),
  (
    '75.01',
    '75',
    'Gorontalo',
    'Kabupaten Gorontalo',
    63000
  ),
  (
    '75.02',
    '75',
    'Gorontalo',
    'Kabupaten Boalemo',
    63000
  ),
  (
    '75.03',
    '75',
    'Gorontalo',
    'Kabupaten Bone Bolango',
    63000
  ),
  (
    '75.04',
    '75',
    'Gorontalo',
    'Kabupaten Pohuwato',
    63000
  ),
  (
    '75.05',
    '75',
    'Gorontalo',
    'Kabupaten Gorontalo Utara',
    63000
  ),
  (
    '75.71',
    '75',
    'Gorontalo',
    'Kota Gorontalo',
    50000
  ),
  (
    '76.01',
    '76',
    'Sulawesi Barat',
    'Kabupaten Pasangkayu',
    63000
  ),
  (
    '76.02',
    '76',
    'Sulawesi Barat',
    'Kabupaten Mamuju',
    63000
  ),
  (
    '76.03',
    '76',
    'Sulawesi Barat',
    'Kabupaten Mamasa',
    63000
  ),
  (
    '76.04',
    '76',
    'Sulawesi Barat',
    'Kabupaten Polewali Mandar',
    63000
  ),
  (
    '76.05',
    '76',
    'Sulawesi Barat',
    'Kabupaten Majene',
    63000
  ),
  (
    '76.06',
    '76',
    'Sulawesi Barat',
    'Kabupaten Mamuju Tengah',
    63000
  ),
  (
    '81.01',
    '81',
    'Maluku',
    'Kabupaten Maluku Tengah',
    82000
  ),
  (
    '81.02',
    '81',
    'Maluku',
    'Kabupaten Maluku Tenggara',
    82000
  ),
  (
    '81.03',
    '81',
    'Maluku',
    'Kabupaten Kepulauan Tanimbar',
    98000
  ),
  ('81.04', '81', 'Maluku', 'Kabupaten Buru', 82000),
  (
    '81.05',
    '81',
    'Maluku',
    'Kabupaten Seram Bagian Timur',
    82000
  ),
  (
    '81.06',
    '81',
    'Maluku',
    'Kabupaten Seram Bagian Barat',
    82000
  ),
  (
    '81.07',
    '81',
    'Maluku',
    'Kabupaten Kepulauan Aru',
    98000
  ),
  (
    '81.08',
    '81',
    'Maluku',
    'Kabupaten Maluku Barat Daya',
    82000
  ),
  (
    '81.09',
    '81',
    'Maluku',
    'Kabupaten Buru Selatan',
    82000
  ),
  ('81.71', '81', 'Maluku', 'Kota Ambon', 65000),
  ('81.72', '81', 'Maluku', 'Kota Tual', 65000),
  (
    '82.01',
    '82',
    'Maluku Utara',
    'Kabupaten Halmahera Barat',
    82000
  ),
  (
    '82.02',
    '82',
    'Maluku Utara',
    'Kabupaten Halmahera Tengah',
    82000
  ),
  (
    '82.03',
    '82',
    'Maluku Utara',
    'Kabupaten Halmahera Utara',
    82000
  ),
  (
    '82.04',
    '82',
    'Maluku Utara',
    'Kabupaten Halmahera Selatan',
    82000
  ),
  (
    '82.05',
    '82',
    'Maluku Utara',
    'Kabupaten Kepulauan Sula',
    98000
  ),
  (
    '82.06',
    '82',
    'Maluku Utara',
    'Kabupaten Halmahera Timur',
    82000
  ),
  (
    '82.07',
    '82',
    'Maluku Utara',
    'Kabupaten Pulau Morotai',
    82000
  ),
  (
    '82.08',
    '82',
    'Maluku Utara',
    'Kabupaten Pulau Taliabu',
    82000
  ),
  (
    '82.71',
    '82',
    'Maluku Utara',
    'Kota Ternate',
    65000
  ),
  (
    '82.72',
    '82',
    'Maluku Utara',
    'Kota Tidore Kepulauan',
    98000
  ),
  (
    '91.03',
    '91',
    'Papua',
    'Kabupaten Jayapura',
    113000
  ),
  (
    '91.05',
    '91',
    'Papua',
    'Kabupaten Kepulauan Yapen',
    135000
  ),
  (
    '91.06',
    '91',
    'Papua',
    'Kabupaten Biak Numfor',
    113000
  ),
  ('91.10', '91', 'Papua', 'Kabupaten Sarmi', 113000),
  (
    '91.11',
    '91',
    'Papua',
    'Kabupaten Keerom',
    113000
  ),
  (
    '91.15',
    '91',
    'Papua',
    'Kabupaten Waropen',
    113000
  ),
  (
    '91.19',
    '91',
    'Papua',
    'Kabupaten Supiori',
    113000
  ),
  (
    '91.20',
    '91',
    'Papua',
    'Kabupaten Mamberamo Raya',
    113000
  ),
  ('91.71', '91', 'Papua', 'Kota Jayapura', 90000),
  (
    '92.02',
    '92',
    'Papua Barat',
    'Kabupaten Manokwari',
    107000
  ),
  (
    '92.03',
    '92',
    'Papua Barat',
    'Kabupaten Fak Fak',
    107000
  ),
  (
    '92.06',
    '92',
    'Papua Barat',
    'Kabupaten Teluk Bintuni',
    107000
  ),
  (
    '92.07',
    '92',
    'Papua Barat',
    'Kabupaten Teluk Wondama',
    107000
  ),
  (
    '92.08',
    '92',
    'Papua Barat',
    'Kabupaten Kaimana',
    107000
  ),
  (
    '92.11',
    '92',
    'Papua Barat',
    'Kabupaten Manokwari Selatan',
    107000
  ),
  (
    '92.12',
    '92',
    'Papua Barat',
    'Kabupaten Pegunungan Arfak',
    107000
  ),
  (
    '93.01',
    '93',
    'Papua Selatan',
    'Kabupaten Merauke',
    138000
  ),
  (
    '93.02',
    '93',
    'Papua Selatan',
    'Kabupaten Boven Digoel',
    138000
  ),
  (
    '93.03',
    '93',
    'Papua Selatan',
    'Kabupaten Mappi',
    138000
  ),
  (
    '93.04',
    '93',
    'Papua Selatan',
    'Kabupaten Asmat',
    138000
  ),
  (
    '94.01',
    '94',
    'Papua Tengah',
    'Kabupaten Nabire',
    150000
  ),
  (
    '94.02',
    '94',
    'Papua Tengah',
    'Kabupaten Puncak Jaya',
    150000
  ),
  (
    '94.03',
    '94',
    'Papua Tengah',
    'Kabupaten Paniai',
    150000
  ),
  (
    '94.04',
    '94',
    'Papua Tengah',
    'Kabupaten Mimika',
    150000
  ),
  (
    '94.05',
    '94',
    'Papua Tengah',
    'Kabupaten Puncak',
    150000
  ),
  (
    '94.06',
    '94',
    'Papua Tengah',
    'Kabupaten Dogiyai',
    150000
  ),
  (
    '94.07',
    '94',
    'Papua Tengah',
    'Kabupaten Intan Jaya',
    150000
  ),
  (
    '94.08',
    '94',
    'Papua Tengah',
    'Kabupaten Deiyai',
    150000
  ),
  (
    '95.01',
    '95',
    'Papua Pegunungan',
    'Kabupaten Jayawijaya',
    225000
  ),
  (
    '95.02',
    '95',
    'Papua Pegunungan',
    'Kab Pegunungan Bintang',
    225000
  ),
  (
    '95.03',
    '95',
    'Papua Pegunungan',
    'Kabupaten Yahukimo',
    225000
  ),
  (
    '95.04',
    '95',
    'Papua Pegunungan',
    'Kabupaten Tolikara',
    225000
  ),
  (
    '95.05',
    '95',
    'Papua Pegunungan',
    'Kabupaten Mamberamo Tengah',
    225000
  ),
  (
    '95.06',
    '95',
    'Papua Pegunungan',
    'Kabupaten Yalimo',
    225000
  ),
  (
    '95.07',
    '95',
    'Papua Pegunungan',
    'Kabupaten Lanny Jaya',
    225000
  ),
  (
    '95.08',
    '95',
    'Papua Pegunungan',
    'Kabupaten Nduga',
    225000
  ),
  (
    '96.01',
    '96',
    'Papua Barat Daya',
    'Kabupaten Sorong',
    107000
  ),
  (
    '96.02',
    '96',
    'Papua Barat Daya',
    'Kabupaten Sorong Selatan',
    107000
  ),
  (
    '96.03',
    '96',
    'Papua Barat Daya',
    'Kabupaten Raja Ampat',
    107000
  ),
  (
    '96.04',
    '96',
    'Papua Barat Daya',
    'Kabupaten Tambrauw',
    107000
  ),
  (
    '96.05',
    '96',
    'Papua Barat Daya',
    'Kabupaten Maybrat',
    107000
  ),
  (
    '96.71',
    '96',
    'Papua Barat Daya',
    'Kota Sorong',
    85000
  );

COMMIT;
