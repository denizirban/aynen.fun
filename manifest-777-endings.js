/* Manifest 777 — deadpan endings. Play remains earnest; the punchline is the outcome. */
(function(){
"use strict";
const A={
 money:{
  "obsessed-signs":[["Para akışı başladı.","Üç kişi senden IBAN istedi.","Üçü de senden para bekliyor.","iban"],["777 sonunda karşına çıktı.","Market fişi 77,70 TL tuttu.","Aldıkların: soda, tuvalet kâğıdı, pil.","receipt"]],
  "ritual-heavy":[["Bolluk geldi.","Teyzen 38 kilo mandalina gönderdi.","Şu an evde yer kalmadı.","oranges"],["Bereket kapını çaldı.","Komşun 14 kavanoz salça bıraktı.","Dolabın üçüncü rafı çöktü.","oranges"]],
  "action-heavy":[["Para kazanmaya başladın.","Kullanmadığın sandalyeyi sattın.","Artık masada ayakta çalışıyorsun.","chair"],["Gelir elde ettin.","Eski telefonunu sattın.","Alıcı seni kendi telefonundan aradı.","phone"]],
  "risk-heavy":[["Kazanç fırsatı geldi.","Hiç tanımadığın biri sana 'abi bir coin var' yazdı.","Mesaj sabah 04.12'de gönderilmiş.","phone"],["Para hareketlendi.","Yanlış hesaba 777 TL gönderdin.","Alıcı açıklamaya 'teşekkürler' yazdı.","receipt"]],
  "lucky-chaos":[["Hesabına para geldi.","İade beklediğin üründen iki kez ödeme yapıldı.","İkinci tutar için iade talebi açıldı.","receipt"],["Hiç beklemediğin para geldi.","Ceketin cebinden 200 TL çıktı.","Ceketi geçen sene de aramıştın.","money"]],
  "burnout":[["Hayatındaki yük azaldı.","Kart limitin doldu.","Artık alışveriş uygulamalarına bakmıyorsun.","phone"],["Giderlerin durdu.","Banka kartını evde unuttun.","İki gündür hiçbir şey alamıyorsun.","receipt"]],
  "balanced":[["Bolluk kendini gösterdi.","Unuttuğun 186,43 TL iade hesabına yattı.","Bildirimde 'işlem tamamlandı' yazıyor.","receipt"],["Hesabında hareket var.","Eski bir arkadaşın 65 TL borcunu ödedi.","Açıklamaya '2022 taksi' yazmış.","money"]]
 },
 love:{
  "obsessed-signs":[["Bir işaret geldi.","Üç gün içinde aynı isimde üç kişiyle tanıştın.","Üçü de adını farklı söylüyor.","phone"],["Aşk frekansı yükseldi.","11.11'de telefonun çaldı.","Arayan diş hekimindi.","phone"]],
  "ritual-heavy":[["Seni sürekli düşünen biri var.","Kargo görevlisi adresini üç gündür bulamıyor.","19 cevapsız araman var.","phone"],["Geçmişten biri döndü.","Eski flörtün 02.17'de 'uyudun mu' yazdı.","Üç ay önceki mesajına da yanıt vermemişti.","phone"]],
  "action-heavy":[["İlk buluşma ayarlandı.","Sen mekânı seçtin. O tarihi unuttu.","Şu an restoranda yalnızsın.","table"],["Yeni bir bağ kurdun.","Tanıştığın kişi seni aile grubuna ekledi.","Henüz ikinci buluşma olmadı.","group"]],
  "risk-heavy":[["Kalbinin sesini dinledin.","Kalp emojisini yanlış kişiye gönderdin.","'Bu ne?' diye cevap geldi.","phone"],["Duygularını açtın.","Eski sevgiline yazacaktın; patronuna yazdın.","Mesaj okunmuş.","phone"]],
  "lucky-chaos":[["Aynı anda iki kapı açıldı.","İki kişi aynı akşam buluşmak istedi.","İki buluşma da aynı kafede.","table"],["Tam istediğin gibi bir mesaj geldi.","'Seni düşünüyordum' yazıyordu.","Mesaj senin telefonuna değil, arkadaşının telefonuna gitmiş.","phone"]],
  "burnout":[["İlişkinde huzur var.","Kimseye yazmıyorsun. Kimse de sana yazmıyor.","Telefonun şarjı üç gündür yüzde 82.","phone"],["Kalbine alan açtın.","Bütün uygulamaları sildin.","Aynı gün eski flörtün apartmanına taşındı.","apartment"]],
  "balanced":[["Yeni biriyle tanıştın.","İlk cümlesi 'ben normalde böyle biri değilim' oldu.","Bunu üç kez daha söyledi.","table"],["Güzel bir sohbet başladı.","İkiniz de aynı filmi seviyorsunuz.","Hanginizin izlediği belli değil.","phone"]]
 },
 career:{
  "obsessed-signs":[["Yönetici oldun.","Apartman WhatsApp grubuna yönetici atandın.","İlk gündem: asansör lambası.","group"],["Unvanın değişti.","Toplantı uygulaması adını 'Yönetici' diye kaydetti.","Kartvizitlerin aynı.","office"]],
  "ritual-heavy":[["Liderlik enerjin fark edildi.","Apartmanın yönetim kuruluna girdin.","Konu: otopark kumandaları.","apartment"],["Terfi haberi geldi.","Aile grubunda 'artık müdürümüz sensin' yazdılar.","Bayram organizasyonu sana kaldı.","group"]],
  "action-heavy":[["Emeğin fark edildi.","Senden bir sunum daha istediler.","Maaş aynı. Slayt sayısı 46.","office"],["Sorumluluğun arttı.","Ofiste yazıcıya artık yalnızca sen bakıyorsun.","Resmî görev tanımında yok.","office"]],
  "risk-heavy":[["Cesaret gösterdin.","Zam mesajını yanlışlıkla muhasebeye attın.","'Talebinizi ilgili birime ilettik.'","inbox"],["Büyük bir adım attın.","Üst yönetime yanlış dosyayı gönderdin.","Dosyanın adı SON_SON_GERCEK_FINAL.pptx.","office"]],
  "lucky-chaos":[["Terfi görüşmesi geldi.","Toplantı aslında başka biri için planlanmıştı.","Kimse toplantıdan çıkmanı istemedi.","office"],["Yeni bir pozisyon açıldı.","İlk başvuran sensin.","Pozisyon 'ofis bitkileri sorumlusu'.","plant"]],
  "burnout":[["İş yükün azaldı.","Toplantıdan çıkarıldın.","Yanlış ekip listesindeymişsin.","calendar"],["Takvimin boşaldı.","Bütün toplantılar iptal edildi.","Yeni toplantı: iptallerin değerlendirilmesi.","calendar"]],
  "balanced":[["Yeni bir yetki kazandın.","Ofis kahve makinesinin şifresi sana verildi.","Şifre: 0000.","office"],["İşinde görünür oldun.","Şirket bülteninde fotoğrafın yayımlandı.","Fotoğrafta fotokopi makinesini taşıyorsun.","office"]]
 },
 home:{
  "obsessed-signs":[["Hayalindeki eve yaklaştın.","777 numaralı daireyi buldun.","Binada 776 numaralı daire yok.","apartment"],["Evin işareti geldi.","İlan numarası 777 ile bitiyor.","İlan 2018'den beri yayında.","apartment"]],
  "ritual-heavy":[["Yeni bir başlangıç geliyor.","Ev sahibin evi satmaya karar verdi.","Üç haftan var.","boxes"],["Yaşam alanın genişledi.","Üst komşu evin anahtarını sana bıraktı.","Çiçekleri sulaman gerekiyor.","key"]],
  "action-heavy":[["Bütçene uygun ev buldun.","İlanda 9 m² kapalı balkon ayrı oda sayılmış.","Emlakçı bunu özellikle vurguluyor.","apartment"],["Aradığın daireyi buldun.","Penceresi tam bir duvara bakıyor.","İlanda 'şehir manzarası' yazıyor.","apartment"]],
  "risk-heavy":[["Taşınma hızlandı.","Evi görmeden nakliye ayarladın.","Koliler yeni evden önce vardı.","boxes"],["Yeni evin neredeyse hazır.","Kapora göndereceğin hesap numarası değişti.","Emlakçı üç farklı IBAN yolladı.","phone"]],
  "lucky-chaos":[["Anahtar eline geçti.","Arkadaşın tatilde evine bakmanı istedi.","Evin balkonunda altı kedi var.","key"],["Evin değişti.","Bir çekilişte bir hafta tiny house kazandın.","Evin banyosu mutfakla aynı yerde.","apartment"]],
  "burnout":[["Evde yeni bir alan açıldı.","Eski dolabı sattın.","İçindekiler artık yerde.","boxes"],["Evin sessizleşti.","Buzdolabı bozuldu.","Artık yalnızca saatin sesini duyuyorsun.","apartment"]],
  "balanced":[["Yeni ev arayışın ilerledi.","Güzel ilan buldun. Fotoğraflar on yıl önce çekilmiş.","Kapıdaki tabela değişmiş.","apartment"],["Beklediğin haber geldi.","Emlakçı 'tam sana göre' bir daire buldu.","Merdiven dördüncü katta bitiyor.","apartment"]]
 },
 viral:{
  "obsessed-signs":[["3,2 milyon kişi seni gördü.","Kedili videonun arkasında poşetini düşürürken çıktın.","Kedinin 84 bin yeni takipçisi var.","cat"],["Görünürlüğün arttı.","Video 777 bin izlendi.","Videoda sen değil, arkandaki güvercin var.","cat"]],
  "ritual-heavy":[["İçeriğin keşfete düştü.","Video 8 saat boyunca 'ses bulunamadı' hatası verdi.","Yorumlarda herkes aynı şeyi soruyor.","phone"],["Görünür oldun.","Seni bir yabancı story'sinde etiketledi.","Etiket yanlış kişiye gidiyor.","social"]],
  "action-heavy":[["İçeriğin etkileşim aldı.","Yorumların yarısı birbirleriyle tartışıyor.","Senden kimse bahsetmiyor.","social"],["Bir içerik tuttu.","Videodaki arka plan halısı soruluyor.","Halı senin değil.","social"]],
  "risk-heavy":[["Algoritma seni fark etti.","Canlı yayında ekran paylaşımını açık unuttun.","120 kişi alışveriş sepetini gördü.","phone"],["Bir anda gündem oldun.","Yorumlara yanlış hesabından cevap verdin.","İkinci hesap da artık tanınıyor.","social"]],
  "lucky-chaos":[["Viral oldun.","Köpeğin esnerken çekilmiş videosu 1,4 milyon izlendi.","Kendi hesabın hâlâ 286 takipçide.","cat"],["Herkes seni konuşuyor.","Bir röportaj videosunda arkadan geçtin.","Adını bilen tek kişi kuzenin.","social"]],
  "burnout":[["Bildirimler patladı.","Telefonun depolama alanı doldu.","Artık yeni bir bildirim gelmiyor.","phone"],["Akışın durdu.","İnternetin kesildiği an eski videon yükseldi.","Sonuçları komşunun telefonundan öğrendin.","phone"]],
  "balanced":[["Yeni takipçiler geldi.","24 kişinin tamamı aynı soyadını taşıyor.","Aile grubunda paylaşılmış.","group"],["İlk büyük yorum geldi.","Yorum: 'arkadaki bitki nereden?'","Videoda bitki senin değil.","plant"]]
 },
 peace:{
  "obsessed-signs":[["Sessizlik geldi.","Telefonun bozuldu.","Kimse sana ulaşamıyor. Sen de kimseye.","phone"],["Dinginlik geldi.","Bildirimlerin tamamen sustu.","Telefon yanlışlıkla uçak modunda.","phone"]],
  "ritual-heavy":[["Evde nihayet sessizlik var.","Üst komşu üç günlüğüne tatile çıktı.","Dördüncü gün matkap geri geldi.","apartment"],["Zihnini boşalttın.","Yapılacaklar listesini sildin.","Neler yazdığını hatırlamıyorsun.","calendar"]],
  "action-heavy":[["Kendine alan açtın.","Üç planı iptal ettin.","Şimdi üç ayrı kişiye açıklama yapıyorsun.","phone"],["Sınır koydun.","Grubu sessize almak yerine gruptan çıktın.","Herkes ayrı ayrı yazıyor.","group"]],
  "risk-heavy":[["Huzuru seçtin.","Bütün gruplardan çıktın.","Dört yeni gruba geri eklendin.","group"],["Dikkatini topladın.","Telefonunu çekmeceye koydun.","Çekmecenin içinde alarm çalıyor.","phone"]],
  "lucky-chaos":[["Sessiz bir hafta başladı.","Mahallende altyapı çalışması durdu.","Sebebi: iş makinesi bozulmuş.","apartment"],["Derin bir mola geldi.","İnternet iki gün kesildi.","Dizi platformu üyeliğin aynı gün yenilendi.","phone"]],
  "burnout":[["Hiçbir bildirim kalmadı.","Telefonunun pili bitti.","Şarj aletini bulamıyorsun.","phone"],["Tam anlamıyla dinlendin.","Alarmın çalmadı.","Toplantının bitiminde uyandın.","calendar"]],
  "balanced":[["Günün sakin geçti.","Apartman grubunda 143 mesaj vardı.","Hiçbirini açmadın.","group"],["Kendine vakit ayırdın.","Bir saat tek başına oturdun.","Ailen 'iyi misin?' diye üç kez aradı.","phone"]]
 },
 custom:{
  "obsessed-signs":[["İşaret tam zamanında geldi.","777 numarasıyla üçüncü kez karşılaştın.","Bu kez sıra numaran.","receipt"]],
  "ritual-heavy":[["Niyetine alan açtın.","Evin ortasında dev bir karton kutu belirdi.","Üstünde yalnızca 'kırılacak' yazıyor.","boxes"]],
  "action-heavy":[["Yeni bir fırsat geldi.","Açtığın formun son alanı 'diğer' çıktı.","İstediğin şey oraya sığmadı.","receipt"]],
  "risk-heavy":[["Kapı açıldı.","Yanlış daireye taşınma ilanı bıraktın.","Daire sahibi hemen aradı.","apartment"]],
  "lucky-chaos":[["Beklenmedik bir gelişme oldu.","Bir çekilişte hiç ihtiyacın olmayan bir ürün kazandın.","Kazandığın şey 12 kilogramlık masa lambası.","plant"]],
  "burnout":[["Evren bir mola verdi.","Bütün alarmların kapandı.","Pazartesi olduğunu salı öğrendin.","calendar"]],
  "balanced":[["Beklediğin haber geldi.","Mesajın konusu 'merhaba' idi.","İçinde sadece 'merhaba' yazıyor.","inbox"]]
 }
};
function profileOf(s){
 const acts=s.actions||0,rit=s.ritual||0,risk=s.risk||0;
 const total=acts+rit+risk||1;
 if((s.hidden||0)>=7)return "obsessed-signs";
 if((s.lucky||0)>=2)return "lucky-chaos";
 if(s.time<=12||s.vibe<=18)return "burnout";
 if(rit/total>=.50)return "ritual-heavy";
 if(acts/total>=.50)return "action-heavy";
 if(risk/total>=.43)return "risk-heavy";
 return "balanced";
}
const names={"obsessed-signs":"İşaretleri çok takip ettin","lucky-chaos":"Tesadüfler üst üste geldi","burnout":"Enerjini tükettin","ritual-heavy":"Niyete odaklandın","action-heavy":"Harekete geçtin","risk-heavy":"Hızlı kararlar verdin","balanced":"Akışta kaldın"};
function pickEnding(s,key){
 const category=A[key]?key:"custom",profile=profileOf(s);
 const pool=A[category][profile]||A[category].balanced||A.custom.balanced;
 const history=Array.isArray(s.history)?s.history:[];
 const path=history.reduce((x,h)=>x+((h.day||0)*17+(h.kind||"").length*11+(h.choice||"").length),0);
 const variant=Math.abs(Math.floor((s.rng||0)+(s.progress||0)*7+(s.hidden||0)*13+path))%pool.length;
 const e=pool[variant];
 return {title:e[0],line:e[1],sub:e[2],scene:e[3],profile,profileLabel:names[profile],category,variant};
}
const NS="http://www.w3.org/2000/svg";
const p=(x,y,w,h,fill="#e7d9c6",rx=3)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'"/>';
const circle=(x,y,r,fill)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"/>';
const txt=(x,y,str,size=18,fill="#1e1a20",weight="700")=>'<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+weight+'">'+str+'</text>';
function sceneParts(kind){
 const ink="#312a36",soft="#bfacca",violet="#b39bc9",coral="#cf866a",cream="#f0ddba";
 const phone=(x=310,y=83)=>p(x,y,160,285,ink,21)+p(x+8,y+10,144,265,"#f8f4ea",16)+p(x+58,y+18,44,5,ink,2)+p(x+57,y+255,46,5,"#d5ced3",3);
 const house=()=>p(208,120,290,245,"#dbcddc",8)+p(230,143,245,42,"#ebdeec",1)+p(242,202,82,87,"#f7efe8",3)+p(360,205,97,155,"#8f7f97",4)+p(375,225,66,79,"#d5bdba",2)+p(183,115,339,14,ink,3);
 let o="";
 switch(kind){
 case "oranges":
  o=p(126,286,520,40,"#b39b9c",2)+p(164,195,130,98,"#d5c3c5",6)+p(480,185,115,110,"#d5c3c5",6)+
  Array.from({length:58},(_,i)=>{const x=190+(i*73)%388,y=120+(Math.floor(i*11)%200),r=12+i%6;return circle(x,y,r,["#d97848","#e99b5d","#d9864d"][i%3])+p(x-1,y-r-3,6,5,"#6e845f",2)}).join("");
  break;
 case "phone":
 case "inbox":
 case "iban":
 case "social":
  o=phone()+p(340,160,100,12,soft,4)+p(340,190,77,12,"#d1c5d5",4)+p(340,220,96,12,"#d1c5d5",4)+
  (kind==="iban"?txt(339,145,"IBAN",21,ink):kind==="social"?txt(341,144,"1.4 M",23,ink):kind==="inbox"?txt(340,145,"GELEN",16,ink):txt(342,143,"19",37,ink))+
  circle(477,96,29,coral)+txt(460,104,"!",30,"white");
  break;
 case "apartment":
 case "boxes":
 case "key":
  o=house();
  if(kind==="boxes"){o+=p(155,302,120,88,"#bb9474",3)+p(287,255,118,133,"#e4bd88",3)+p(437,314,105,77,"#b98a69",3)+p(155,302,120,8,"#d7b693")+p(287,256,118,9,"#cda579");}
  if(kind==="key"){o+=circle(504,250,35,cream)+circle(504,250,14,"#f5efe9")+p(527,246,90,19,cream,3)+p(589,258,14,26,cream,0);}
  break;
 case "office":
 case "group":
 case "calendar":
 case "table":
  o=p(142,275,500,27,ink,4)+p(170,305,20,95,ink,2)+p(580,305,20,95,ink,2)+p(236,122,270,160,"#f3eadf",12);
  if(kind==="office"){o+=p(275,145,190,112,ink,7)+p(288,155,164,90,"#a7bdac",3)+txt(319,211,"46",65,ink)+p(500,224,52,64,cream,3);}
  if(kind==="calendar"){o+=p(258,138,229,127,"#ded1dd",7)+p(258,138,229,32,violet,4)+Array.from({length:12},(_,i)=>p(281+(i%4)*47,180+Math.floor(i/4)*25,30,14,i%3===0?coral:"#fcf7f0",2)).join("");}
  if(kind==="group"){o+=phone(285,111)+Array.from({length:6},(_,i)=>circle(335+i%3*45,213+Math.floor(i/3)*45,12,["#9ca9c4","#b989aa","#e7b98f"][i%3])).join("");}
  if(kind==="table"){o+=circle(342,199,48,"#d9c8bc")+p(302,193,87,13,ink,4)+p(338,210,17,55,"#b99eb8",2);}
  break;
 case "receipt":
 case "money":
  o=p(270,78,238,312,"#fbf6ea",2)+p(284,90,208,28,ink,1)+txt(307,109,"777",19,"#fdf4ec")+
  Array.from({length:6},(_,i)=>p(307,146+i*30,118+(i%2)*51,8,"#b3a7aa",3)).join("")+p(302,335,166,3,ink,1)+txt(311,367,kind==="money"?"200 TL":"77,70",29,ink);
  break;
 case "chair":
  o=p(316,135,170,155,"#c38f75",12)+p(290,282,215,26,ink,3)+p(307,306,20,92,ink,2)+p(461,306,20,92,ink,2);
  break;
 case "cat":
 case "plant":
  o=p(180,299,435,28,ink,4)+p(223,328,20,68,ink)+p(552,328,20,68,ink);
  if(kind==="cat"){o+=circle(385,228,87,"#cfab8c")+'<path d="M325 189L326 103 373 153 M397 153L447 101 450 191" fill="#cfab8c"/>'+circle(352,224,7,ink)+circle(414,224,7,ink)+'<path d="M375 246Q384 255 395 245" stroke="'+ink+'" stroke-width="5" fill="none"/>';}
  if(kind==="plant"){o+=p(329,255,120,126,"#be9073",8)+Array.from({length:9},(_,i)=>'<ellipse cx="'+(388+Math.sin(i*3)*55)+'" cy="'+(185+Math.floor(i/3)*19)+'" rx="27" ry="62" fill="'+(["#728974","#8ea48a","#567869"][i%3])+'" transform="rotate('+(i*40)+' '+(388+Math.sin(i*3)*55)+' '+(185+Math.floor(i/3)*19)+')"/>').join("");}
  break;
 default:o=phone();
 }
 return o;
}
function svgMarkup(scene){
 return '<svg class="absurd-illustration" xmlns="'+NS+'" viewBox="0 0 760 460" role="img" aria-label="Sonuç için hazırlanmış editoryal illüstrasyon">'+
 '<defs><linearGradient id="end-floor" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f6f0eb"/><stop offset="1" stop-color="#e6d9df"/></linearGradient></defs>'+
 '<rect x="0" y="0" width="760" height="460" fill="url(#end-floor)"/>'+
 '<path d="M0 365L380 274L760 365V460H0Z" fill="#ddd0d5" opacity=".64"/>'+
 '<ellipse cx="380" cy="387" rx="287" ry="28" fill="#57475d" opacity=".13"/>'+
 sceneParts(scene)+
 '<g opacity=".55"><circle cx="118" cy="95" r="4" fill="#aa89b4"/><circle cx="629" cy="130" r="6" fill="#aa89b4"/><path d="M627 309l12 -13m-12 0l12 13" stroke="#9c89a0" stroke-width="2"/></g>'+
 '<text x="27" y="431" font-family="Arial,sans-serif" font-size="11" letter-spacing="2" fill="#746774">MANIFEST 777 · AYNEN.FUN</text>'+
 '<text x="735" y="431" text-anchor="end" font-family="Arial,sans-serif" font-size="13" fill="#746774">07/07</text>'+
 '</svg>';
}
window.Manifest777Ending={resolve:pickEnding,profileOf,svgMarkup,catalog:A};
})();