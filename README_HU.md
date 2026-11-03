# MARKAI — fejlesztői kezdőcsomag (v0.2)

Ez egy **saját gépen futtatható, egyszemélyes admin prototípus**, amely:
- a korábbi MARKAI felületet tartalmazza;
- szerveroldali OpenAI Responses API végpontot biztosít (`POST /api/ai`);
- az API-kulcsot a szerveren tartja;
- jelszóval védi a felületet (HTTP Basic Auth);
- PWA-manifestet és alap offline shell cache-t tartalmaz.

## Indítás

1. Telepíts Node.js 20 vagy újabb verziót.
2. Csomagold ki ezt a ZIP-et.
3. A mappában futtasd: `npm install`
4. Másold az `.env.example` fájlt `.env` néven.
5. Állíts be egy legalább 16 karakteres, egyedi `ADMIN_PASSWORD` jelszót.
6. Add meg az `OPENAI_API_KEY` értékét. Az API-használat külön díjköteles lehet.
7. Ha a fiókodban más modell érhető el, módosítsd az `OPENAI_MODEL` értékét.
8. Indítás: `npm start`
9. Nyisd meg: `http://localhost:3000` és jelentkezz be az `.env`-ben megadott adatokkal.

## Mi működik és mi nem?

**Működik:** a webes dashboard, nyelvváltó, termék- és szolgáltatásötletek, jóváhagyási lista demó kezelése, szerveroldali AI-chat, alap jelszavas védelem, PWA telepíthetőségi alap.

**Még nincs bekötve:** valódi webshop/rendelésadatbázis, banki kapcsolat, fizetés és előfizetés, ügyfélfiókok, több-bérlős SaaS, e-mail-küldés, közösségi média publikálás, mobil app store kiadás. A dashboard statisztikái és példatermékei továbbra is bemutatóadatok; nem valódi bevételek.

## Fontos élesítés előtt

- Ezt a verziót ne tedd nyilvános, több ügyfél által használt SaaS-ként élesbe.
- A Basic Auth csak egyszerű, egyszemélyes admin-védelem. Nyilvános termékhez külön felhasználói regisztráció, biztonságos munkamenet, adatbázis, jogosultságkezelés, jelszó-visszaállítás, auditnapló és adatvédelmi folyamat kell.
- Éles internetes üzemeltetéshez HTTPS szükséges.
- Fizetéshez külön, szerveroldali fizetési szolgáltatói integráció és webhook-ellenőrzés kell. A rendszer nem kezeli és nem tárolja a bankkártyaadatokat.
- Minden hirdetés, ügyfélnek küldött üzenet, pénzköltés, ár- vagy kifizetésmódosítás maradjon jóváhagyáshoz kötve.
- Magyarországi értékesítés előtt könyvelővel/jogásszal ellenőriztesd az adózást, számlázást, ÁSZF-et, adatkezelést, fogyasztói tájékoztatást és digitális tartalomra vonatkozó szabályokat.

## Következő fejlesztési lépés

A következő mérföldkő egy adatbázisos termék-/rendeléskezelés és valódi jóváhagyási munkafolyamat, majd csak ezután fizetési és előfizetési integráció.
