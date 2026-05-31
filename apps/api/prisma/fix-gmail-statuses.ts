/**
 * Status-Korrekturen basierend auf Gmail-Recherche (31.05.2026)
 *
 * FUNDE:
 * 1. Gadamauri:  analyzed     → contract_signed  (Diana 23.04: "Vertrag unterschrieben")
 * 2. Markiza:    contract_sent → contract_signed  (Diana 20.04: "Verträge unterschrieben")
 * 3. Usmonov:    contract_signed → certification_in_progress (Projektstart 09.04, Unterlagen laufen)
 * 4. Makhmudov:  analyzed     → contract_sent    (Vertrag gesendet 19.01 an rakhmonjonmakhmudov74@gmail.com)
 * 5. Piratheepan: analyzed    → outline_sent     (Ramon an Diana 20.05: "Standardvertrag fertigmachen und schicken")
 * 6. Guri:       E-Mail gefunden: guri.elinda@gmail.com
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const ramon = { email: 'info@speak2.de' }

async function main() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: ramon.email } })
  console.log('🔧 Gmail-basierte Status-Korrekturen...\n')

  // ── 1. GADAMAURI: analyzed → contract_signed ────────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-008' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-008' },
        data: {
          status:          'contract_signed',
          waitingFor:      'speak2',
          contractSignedAt: new Date('2026-04-23'),
          notes: (c.notes || '') + `\n\n[23.04.2026 — Gmail/Diana Lau]: "Frau Gadamauri hat den Dolmetscher- und Übersetzervertrag unterschrieben."
[08.04.2026 — Gmail/Ramon]: Vertragszusatz an Meedina0409@hotmail.com gesendet (speak2-Sonderzusage).
Nächster Schritt: Unterlagen für Ermächtigungsantrag bei LG Hamburg zusammenstellen.`,
        },
      })
      await prisma.pipelineEvent.create({
        data: {
          candidateId: c.id, fromStatus: 'analyzed', toStatus: 'contract_signed',
          triggeredById: user.id, isAutomated: false,
          notes: 'Gmail-Fund: Diana Lau 23.04.2026 bestätigt Vertragsunterzeichnung',
          createdAt: new Date('2026-04-23'),
        },
      })
      console.log('✅ Gadamauri:   analyzed → contract_signed  (23.04.2026)')
    }
  }

  // ── 2. MARKIZA: contract_sent → contract_signed ─────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-006' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-006' },
        data: {
          status:          'contract_signed',
          waitingFor:      'speak2',
          contractSignedAt: new Date('2026-04-20'),
          notes: (c.notes || '') + `\n\n[20.04.2026 — Gmail/Diana Lau]: "Frau Zane Markiza hat die Verträge unterschrieben und gleichzeitig ihre neue Anschrift mitgeteilt."
Unterlagen im Anhang: cta_dolmetscher-mz.pdf + s2_übersetzer-mz.pdf (unterschriebene Verträge).
[15.05.2026]: Diana fragt ob Roadmap vorhanden. [17.05.2026]: Ramon: "Wegen Gadamauri und Zane warten wir noch auf Rückmeldung von Thomas."
Nächster Schritt: Thomas kontaktiert RP Karlsruhe (Gleichwertigkeitsfeststellung, Frau Gebhardt).`,
        },
      })
      await prisma.pipelineEvent.create({
        data: {
          candidateId: c.id, fromStatus: 'contract_sent', toStatus: 'contract_signed',
          triggeredById: user.id, isAutomated: false,
          notes: 'Gmail-Fund: Diana Lau 20.04.2026 bestätigt Vertragsunterzeichnung (mit Anhängen)',
          createdAt: new Date('2026-04-20'),
        },
      })
      console.log('✅ Markiza:     contract_sent → contract_signed  (20.04.2026)')
    }
  }

  // ── 3. USMONOV: contract_signed → certification_in_progress ─────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-002' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-002' },
        data: {
          status:                'certification_in_progress',
          waitingFor:            'candidate',
          certificationStartedAt: new Date('2026-04-09'),
          notes: (c.notes || '') + `\n\n[08.04.2026 — Gmail/Ramon]: Projektanweisungen an Diana gesendet.
[09.04.2026 — cundt.academy]: Projektstart-E-Mail an usmonov.faridjon2021@gmail.com (Ermächtigung Usbekisch).
[14.04.2026 — Diana]: "Usmonov hat heute geantwortet. Er hat beglaubigte Übersetzungen von Zeugnissen, Apostille braucht noch Zeit."
[23.04.2026 — Diana]: "Usmonov braucht noch Zeit mit der Apostille und beantragt heute sein Führungszeugnis."
Status: Dokumente laufen (Apostille, Führungszeugnis). Noch kein Gerichtsantrag eingereicht.
Nächster Schritt: Apostille + Führungszeugnis abwarten, dann Antrag LG Augsburg (Ivonne Kern).`,
        },
      })
      await prisma.pipelineEvent.create({
        data: {
          candidateId: c.id, fromStatus: 'contract_signed', toStatus: 'certification_in_progress',
          triggeredById: user.id, isAutomated: false,
          notes: 'Gmail-Fund: Projektstart 09.04.2026. Dokumente in Vorbereitung (Apostille, Führungszeugnis).',
          createdAt: new Date('2026-04-09'),
        },
      })
      console.log('✅ Usmonov:     contract_signed → certification_in_progress  (09.04.2026)')
    }
  }

  // ── 4. MAKHMUDOV: analyzed → contract_sent ──────────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-007' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-007' },
        data: {
          status:        'contract_sent',
          waitingFor:    'candidate',
          email:         'rakhmonjonmakhmudov74@gmail.com',
          contractSentAt: new Date('2026-01-19'),
          notes: (c.notes || '') + `\n\n[19.01.2026 — Gmail/Ramon]: Vertragsentwürfe gesendet an rakhmonjonmakhmudov74@gmail.com
"Hallo Rakhmonjon, anbei endlich die Verträge und eine Erläuterung dazu. Lies sie dir in aller Ruhe durch und stelle mir gern alle Fragen. Wenn alles passt können wir loslegen."
Anhänge: vertragserklaerung_kandidaten.pdf, cta_dolmetschervertrag.pdf, speak2_übersetzervertrag.pdf
Kein Follow-up dokumentiert. Unterschrift ausstehend.`,
        },
      })
      await prisma.pipelineEvent.create({
        data: {
          candidateId: c.id, fromStatus: 'analyzed', toStatus: 'contract_sent',
          triggeredById: user.id, isAutomated: false,
          notes: 'Gmail-Fund: Vertrag am 19.01.2026 an rakhmonjonmakhmudov74@gmail.com gesendet',
          createdAt: new Date('2026-01-19'),
        },
      })
      console.log('✅ Makhmudov:   analyzed → contract_sent  (19.01.2026)')
      console.log('   + E-Mail: rakhmonjonmakhmudov74@gmail.com')
    }
  }

  // ── 5. PIRATHEEPAN: analyzed → outline_sent ─────────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-011' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-011' },
        data: {
          status:       'outline_sent',
          waitingFor:   'candidate',
          outlineSentAt: new Date('2026-05-20'),
          notes: (c.notes || '') + `\n\n[20.05.2026 — Gmail/Ramon an Diana]: "Standardverträge wie auch für Hajo fertigmachen und schicken" (mit CV-Anhang Sinthujaya Piratheepan + Zertifikate).
→ Diana bereitet Standardvertrag vor. Status: Vertrag wird gerade verschickt.`,
        },
      })
      await prisma.pipelineEvent.create({
        data: {
          candidateId: c.id, fromStatus: 'analyzed', toStatus: 'outline_sent',
          triggeredById: user.id, isAutomated: false,
          notes: 'Gmail-Fund: Ramon 20.05.2026 Diana angewiesen, Standardvertrag vorzubereiten',
          createdAt: new Date('2026-05-20'),
        },
      })
      console.log('✅ Piratheepan: analyzed → outline_sent  (20.05.2026, Vertrag in Vorbereitung)')
    }
  }

  // ── 6. GURI: E-Mail-Adresse aktualisieren ───────────────────────────────
  {
    await prisma.candidate.update({
      where: { candidateRef: 'SP-2026-005' },
      data: {
        email: 'guri.elinda@gmail.com',
        notes: (await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-005' }, select: { notes: true } }))?.notes
          + `\n\n[25.03.2026 — Gmail/Diana]: Frau Guri hat Rückfragen zum Angebot (via guri.elinda@gmail.com).
[31.03.2026 — Gmail/Diana]: Weitere E-Mail von Guri. Status: Interesse vorhanden, aber Fragen.`,
      },
    })
    console.log('✅ Guri:         E-Mail gefunden: guri.elinda@gmail.com')
  }

  // ── Zusammenfassung ──────────────────────────────────────────────────────
  const candidates = await prisma.candidate.findMany({
    select: { candidateRef: true, firstName: true, lastName: true, status: true },
    orderBy: { candidateRef: 'asc' },
  })

  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           ✅  Gmail-Korrekturen abgeschlossen!                   ║
╠═══════════════════════════════════════════════════════════════════╣`)
  for (const c of candidates) {
    const line = `  ${c.candidateRef}  ${(c.firstName + ' ' + c.lastName).padEnd(25)} → ${c.status}`
    console.log(`║  ${line.padEnd(63)}║`)
  }
  console.log(`╠═══════════════════════════════════════════════════════════════════╣
║  WICHTIGE NEUE ERKENNTNISSE:                                      ║
║  • Gadamauri: Vertrag unterschrieben (23.04.2026) ✅              ║
║  • Markiza: Verträge unterschrieben (20.04.2026) ✅               ║
║  • Usmonov: Zertifizierung läuft! Apostille+Führungszeugnis       ║
║  • Makhmudov: Vertrag war schon Jan 2026 geschickt!               ║
║  • Piratheepan: Diana bereitet Vertrag vor (20.05.2026)           ║
║  • Guri: E-Mail guri.elinda@gmail.com gefunden                    ║
╚═══════════════════════════════════════════════════════════════════╝
`)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) }).finally(() => prisma.$disconnect())
