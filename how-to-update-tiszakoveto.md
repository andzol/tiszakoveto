# Hogyan frissítsük a Tisza Követő adatbázisát?

Ez a dokumentum leírja, hogyan kövessük nyomon a vállalások teljesülését, és hogyan frissítsük a `vallalasok.json` fájlt.

---

## A két fő forrás

### 1. Magyar Közlöny — `magyarkozlony.hu`

A Magyar Közlöny az egyetlen hivatalos forrás, ahol egy törvény vagy rendelet **jogerősen megjelenik**. Ha egy vállalás teljesült, szinte mindig van Magyar Közlöny-beli megjelenése.

**Hogyan keress?**

1. Menj a [magyarkozlony.hu/kereses](https://www.magyarkozlony.hu/kereses) oldalra
2. A szöveges keresőbe írj kulcsszót (pl. `európai ügyészség`, `minimálbér adó`)
3. Szűrj évre/hónapra ha tudod a várható időpontot
4. A `*` karakterrel töredékre is lehet keresni (pl. `vagyonad*`)
5. Ha megvan a jogszabály, nézd meg a kihirdetés dátumát → ez lesz a `donedate`

**Mit jelent a megjelenés a Magyar Közlönyben?**
- Törvény kihirdetve → a vállalás **teljesült**
- Rendelet megjelent → a vállalás **teljesült**
- Ha csak tárgyalás/javaslat fázisban van → még **nem teljesült**

---

### 2. Nemzeti Jogszabálytár — `njt.jog.gov.hu`

Az NJT a hatályos jogszabályok kereshető adatbázisa. Mindig **naprakészebb** a Magyar Közlöny böngészőfelületénél.

**Hogyan keress?**

1. Menj az [njt.jog.gov.hu](https://njt.jog.gov.hu) oldalra
2. Keresési mezők:
   - **Szó vagy kifejezés** → szabad szöveges keresés (pl. `ügynökakta`, `vagyonadó`)
   - **Típus** → válaszd a `törvény`-t ha törvényre vársz, `kormányrendelet`-et ha rendeletre
   - **Évszám** → szűkítsd le a várható évre
3. Kapcsold be a `csak hatályos` opciót ha azt akarod látni, mi van már érvényben
4. A keresőrendszer a toldalékolt alakokat is felismeri (pl. `ügyészség` megtalálja az `ügyészséghez` szót is)

**Hasznos tipp:** Az NJT-n a jogszabályok szövege is olvasható, és látható a módosítások története.

---

### 3. Parlament — `parlament.hu`

A parlament.hu-n azt lehet követni, hogy egy vállaláshoz kapcsolódó törvényjavaslat **hol tart a folyamatban** — benyújtva, bizottsági szakasz, szavazásra vár, elfogadva.

**Hogyan keress?**

1. **Irományok** (törvényjavaslatok): Menj az `Országgyűlés → Irományok` menüpontra
   - Keress témaszóra (pl. `európai ügyészség`)
   - Látni fogod a javaslat státuszát: benyújtva / bizottsági / elfogadva / elutasítva
2. **Szavazások**: `Országgyűlés → Szavazások`
   - Ide kerül minden plenáris szavazás eredménye
   - Dátum és tárgyszó szerint szűrhető
3. **Bizottságok**: `Országgyűlés → Bizottságok`
   - A releváns bizottság oldalán láthatók az ülések és a napirend

**Mikor jelzi előre a teljesülést?**
- Ha egy iromány státusza `"elfogadva"` → várható Magyar Közlöny-beli megjelenés néhány napon belül

---

## A `vallalasok.json` fájl szerkezete

```json
{
  "id": 1,
  "category": "korrupcio_elleni_harc_es_jogallam",
  "todo": "Európai Ügyészséghez való csatlakozás",
  "note": "Opcionális megjegyzés a vállalás alatt kisebb betűkkel.",
  "isdone": false,
  "donedate": null,
  "deadline": "2030-03-30"
}
```

| Mező | Típus | Leírás |
|---|---|---|
| `id` | szám | Egyedi azonosító — soha ne módosítsd |
| `category` | szöveg | Kategória kulcs — lásd a lista alján |
| `todo` | szöveg | A vállalás szövege |
| `note` | szöveg / null | Opcionális megjegyzés (pl. forrás, dátum-info) — kisebb dőlt betűvel jelenik meg |
| `isdone` | boolean | `true` ha teljesült, `false` ha nem |
| `donedate` | dátum / null | Teljesítés dátuma ISO formátumban (`"2026-05-01"`) — csak ha `isdone: true` |
| `deadline` | dátum / null | Határidő ISO formátumban — alap: `"2030-03-30"` |

---

## ⚠️ Alapelv: csak hatályba lépés után jelölhető teljesítettnek

> **Híroldal nem elegendő bizonyíték.** Egy vállalás csak akkor kerülhet `"isdone": true` státuszba, ha a vonatkozó jogszabály megjelent a **Magyar Közlönyben** és **hatályba lépett** — ezt a **Nemzeti Jogszabálytáron (NJT)** ellenőrzöm.

| Forrás | Mikor elegendő? |
|---|---|
| Híroldal, sajtóközlemény | ❌ Nem — csak tájékoztatás, hogy merre érdemes keresni |
| Parlamenti szavazás eredménye | ❌ Nem — elfogadott, de még nem hatályos |
| Magyar Közlönyben megjelent | ⚠️ Részben — kihirdetve, de a hatályba lépés dátuma számít |
| NJT-n „hatályos" státuszban van | ✅ Igen — ez a teljesítés bizonyítéka |

A `donedate` mindig a **hatályba lépés dátuma**, nem a kihirdetésé és nem a parlamenti szavazásé.

---

## Lépések egy vállalás teljesítettré jelöléséhez

1. **Keresd meg a jogszabályt** — Magyar Közlöny vagy NJT (kulcsszóra keresve)
2. **Ellenőrizd az NJT-n** hogy „hatályos"-e, és mi a hatályba lépés dátuma
3. **Jegyezd fel a dátumot** — a **hatályba lépés** napja lesz a `donedate`
4. **Nyisd meg a `vallalasok.json`-t** a szerkesztőben
5. **Keresd meg az id alapján** a megfelelő sort (Ctrl+F → `"id":5`)
6. **Módosítsd:**
   - `"isdone": false` → `"isdone": true`
   - `"donedate": null` → `"donedate": "2026-05-14"` (hatályba lépés dátuma)
7. **Adj note-ot** a forrás megjelölésével:
   ```json
   "note": "2026. évi XY. törvény — Magyar Közlöny 2026/45. szám, hatályba lépett: 2026-05-14."
   ```
8. **Mentés → git commit → git push** → az oldal ~30 másodperc alatt frissül

---

## Új vállalás hozzáadása

1. Keresd meg a legmagasabb `id` értéket a JSON-ben (jelenleg: 92)
2. Az új elem `id`-ja legyen a következő szám
3. Szúrd be a megfelelő kategória végére
4. Kötelező mezők: `id`, `category`, `todo`, `isdone`, `deadline`
5. Ha nincs saját határidő: `"deadline": "2030-03-30"`
6. `note` mező opcionális

---

## Kategóriák

| Kulcs | Magyar megnevezés |
|---|---|
| `korrupcio_elleni_harc_es_jogallam` | Korrupció elleni harc és jogállam |
| `gazdasag_es_koltsegvetes` | Gazdaság és költségvetés |
| `adopolitika` | Adópolitika |
| `egeszsegugy` | Egészségügy |
| `oktatas_es_tudomany` | Oktatás és tudomány |
| `szocialis_halo_es_csaladtamogatas` | Szociális háló és családtámogatás |
| `nyugdij_es_idosgondozas` | Nyugdíj és idősgondozás |
| `gyermekvedelem` | Gyermekvédelem |
| `infrastruktura_es_kozlekedes` | Infrastruktúra és közlekedés |
| `lakhatas` | Lakhatás |
| `energetika_kornyezet_es_allatvedelem` | Energetika, környezet és állatvédelem |
| `kulpolitika_honvedelem_es_nemzetpolitika` | Külpolitika, honvédelem és nemzetpolitika |
| `allamigazgatas_es_onkormanyzatok` | Államigazgatás és önkormányzatok |

---

## Heti ellenőrzési rutin (javasolt)

1. **Magyar Közlöny RSS feed** — iratkozz fel a [magyarkozlony.hu](https://www.magyarkozlony.hu) RSS csatornájára, hogy azonnal értesülj új kiadványokról
2. **parlament.hu Irományok** — hetente egyszer nézd át a benyújtott törvényjavaslatokat
3. **NJT kulcsszó-keresés** — havonta futtass keresést a fontosabb vállalások kulcsszavaira

---

## Git workflow emlékeztető

```bash
# 1. Győződj meg hogy naprakész a helyi verzió
git pull origin main

# 2. Módosítsd a vallalasok.json-t

# 3. Commitolj és pusholj
git add vallalasok.json
git commit -m "Teljesítve: [vállalás rövid neve] (id: XX)"
git push origin main

# Az oldal ~30 másodpercen belül frissül automatikusan.
```
