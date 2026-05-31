import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create users
  const ramon = await prisma.user.upsert({
    where: { email: 'info@speak2.de' },
    update: {},
    create: {
      email: 'info@speak2.de',
      fullName: 'Ramón Hansmeyer',
      role: 'admin',
    },
  })

  const thomas = await prisma.user.upsert({
    where: { email: 'thomas@speak2.de' },
    update: {},
    create: {
      email: 'thomas@speak2.de',
      fullName: 'Thomas Schlegtendal',
      role: 'staff',
    },
  })

  console.log('✅ Users created')

  // Create Bundesland rules
  const bundeslaender = [
    {
      bundeslandCode: 'BY',
      bundeslandName: 'Bayern',
      certificationName: 'Ermächtigung',
      difficulty: 'easy' as const,
      hasExceptionRule: true,
      responsibleAuthority: 'Landgericht',
      courtName: 'Landgericht München I',
      legalBasisCitation: 'BayDolmG + LG Augsburg Ausnahmeregelung',
      estimatedDurationDays: 42,
      typicalCostMin: 400,
      typicalCostMax: 700,
      specialNotes: 'Ausnahmeregelung für seltene Sprachen bestätigt durch LG Augsburg (Ivonne Kern). Rechtssprache-Nachweis NICHT für Übersetzer erforderlich (nur Dolmetscher).',
    },
    {
      bundeslandCode: 'SA',
      bundeslandName: 'Sachsen-Anhalt',
      certificationName: 'Ermächtigung',
      difficulty: 'easy' as const,
      hasExceptionRule: true,
      responsibleAuthority: 'OLG',
      courtName: 'OLG Naumburg',
      courtContact: 'olg@justiz.sachsen-anhalt.de',
      legalBasisCitation: '§142 Abs. 3 ZPO',
      estimatedDurationDays: 56,
      typicalCostMin: 400,
      typicalCostMax: 700,
      specialNotes: 'Direkte Ermächtigung durch OLG. WICHTIG: korrekte E-Mail ist olg@justiz.sachsen-anhalt.de (NICHT poststelle@...)',
    },
    {
      bundeslandCode: 'SN',
      bundeslandName: 'Sachsen',
      certificationName: 'Ermächtigung',
      difficulty: 'easy' as const,
      hasExceptionRule: true,
      responsibleAuthority: 'OLG',
      courtName: 'OLG Dresden',
      courtContact: 'Frau Braun',
      legalBasisCitation: 'SächsDolmPrüfVO',
      estimatedDurationDays: 70,
      typicalCostMin: 700,
      typicalCostMax: 1100,
      specialNotes: 'Zuerkennung ohne Prüfung möglich wenn Sprache seit 3+ Jahren nicht geprüft wurde. Rechtssprache-Grundkenntnisse (~500€) müssen nachgewiesen werden.',
    },
    {
      bundeslandCode: 'NI',
      bundeslandName: 'Niedersachsen',
      certificationName: 'Ermächtigung',
      difficulty: 'easy' as const,
      hasExceptionRule: true,
      responsibleAuthority: 'OLG',
      courtName: 'OLG Celle',
      legalBasisCitation: 'NJG §23 → §4 GDolmG',
      estimatedDurationDays: 56,
      typicalCostMin: 700,
      typicalCostMax: 1100,
      specialNotes: '§4 GDolmG (alternative Nachweise) gilt auch für Übersetzer. Tamil wird in Niedersachsen NICHT geprüft → §4 anwendbar.',
    },
    {
      bundeslandCode: 'HE',
      bundeslandName: 'Hessen',
      certificationName: 'Beeidigung',
      difficulty: 'medium' as const,
      hasExceptionRule: true,
      responsibleAuthority: 'Hessische Lehrkräfteakademie',
      courtName: 'Hessische Lehrkräfteakademie',
      courtContact: 'Heike Kukuk, Tel: +49 6151 3682-558',
      legalBasisCitation: 'Hessisches Überprüfungsverfahren',
      estimatedDurationDays: 270,
      typicalCostMin: 1100,
      typicalCostMax: 1650,
      specialNotes: 'ACHTUNG: Prüfung nur im November! Ca. 60 Sprachen prüfbar. Kosten: 225€ Prüfungsgebühr. Timing-Risiko beachten.',
    },
    {
      bundeslandCode: 'BB',
      bundeslandName: 'Brandenburg',
      certificationName: 'Ermächtigung',
      difficulty: 'easy' as const,
      hasExceptionRule: true,
      responsibleAuthority: 'Landgericht',
      courtName: 'LG Frankfurt (Oder)',
      legalBasisCitation: '§3 Abs. 3 BbgSpMG',
      estimatedDurationDays: 70,
      typicalCostMin: 700,
      typicalCostMax: 1100,
      specialNotes: 'Ausnahmeregelung für seltene Sprachen. Empfehlungsschreiben der Botschaft (z.B. Usbekische Botschaft Berlin) hilft sehr.',
    },
    {
      bundeslandCode: 'HB',
      bundeslandName: 'Bremen',
      certificationName: 'Ermächtigung',
      difficulty: 'medium' as const,
      hasExceptionRule: false,
      responsibleAuthority: 'OLG',
      courtName: 'OLG Bremen',
      legalBasisCitation: 'Standardverfahren OLG',
      estimatedDurationDays: 70,
      typicalCostMin: 700,
      typicalCostMax: 1100,
      specialNotes: 'Standardweg. Keine spezifische Ausnahmeregelung, aber Praxis ist kooperativ.',
    },
    {
      bundeslandCode: 'HH',
      bundeslandName: 'Hamburg',
      certificationName: 'Ermächtigung',
      difficulty: 'medium' as const,
      hasExceptionRule: false,
      responsibleAuthority: 'Landgericht',
      courtName: 'LG Hamburg',
      legalBasisCitation: 'Standardverfahren LG',
      estimatedDurationDays: 84,
      typicalCostMin: 700,
      typicalCostMax: 1650,
      specialNotes: 'Staatliche Prüfung für manche Sprachen verfügbar (z.B. Lettisch). Bei staatlicher Prüfung höhere Kosten aber höhere Erfolgschance.',
    },
    {
      bundeslandCode: 'BW',
      bundeslandName: 'Baden-Württemberg',
      certificationName: 'Ermächtigung',
      difficulty: 'complex' as const,
      hasExceptionRule: false,
      responsibleAuthority: 'Regierungspräsidium Karlsruhe',
      courtName: 'Regierungspräsidium Karlsruhe',
      courtContact: 'Frau Annette Gebhardt, Tel: 0721-926 4627, Annette.Gebhardt@rpk.bwl.de | Frau Karin Emmenecker-Fink, Tel: 0721-926 4235',
      legalBasisCitation: 'KEINE Ausnahmeregelung für seltene Sprachen',
      estimatedDurationDays: 270,
      typicalCostMin: 1650,
      typicalCostMax: 2500,
      specialNotes: 'HÖCHSTES RISIKO & KOSTEN. Keine Ausnahme für seltene Sprachen (Info: Frau Graf, LG Freiburg). Zwei Wege: (1) Gleichwertigkeitsfeststellung beim RP Karlsruhe, Referat 76 (50-60% Erfolg, 550-750€, 3-6 Mon.) oder (2) Staatliche Prüfung Hamburg (70-80% Erfolg). Zuständiges LG: Waldshut-Tiengen (NICHT Freiburg!).',
    },
  ]

  for (const bl of bundeslaender) {
    await prisma.bundeslandRule.upsert({
      where: { bundeslandCode: bl.bundeslandCode },
      update: bl,
      create: { ...bl, updatedById: ramon.id },
    })
  }

  console.log('✅ Bundesland rules created (9 Bundesländer)')

  // Create email templates
  const templates = [
    {
      slug: 'outline_introduction',
      name: 'Outline / Hinweisblatt senden',
      description: 'Erste Kontaktaufnahme nach Analyse - Konditionen vorstellen',
      subjectTmpl: 'Ermächtigung als {{sprache}}-Übersetzer/in — Informationen von speak2',
      bodyHtmlTmpl: `<p>Sehr geehrte/r {{kandidat_name}},</p>
<p>vielen Dank für Ihr Interesse an einer Zusammenarbeit mit speak2.</p>
<p>Wir haben Ihre Unterlagen geprüft und freuen uns, Ihnen mitteilen zu können, dass wir gerne die Kosten Ihrer Ermächtigung als <strong>{{sprache}}</strong>-Übersetzer/in übernehmen möchten.</p>
<p><strong>Ihr Weg in {{bundesland}}:</strong><br>
Zuständig ist: {{gericht_name}}<br>
Rechtliche Grundlage: {{rechtliche_grundlage}}</p>
<p><strong>Was speak2 übernimmt:</strong> Ca. {{kosten_min}}–{{kosten_max}} € Zertifizierungskosten</p>
<p><strong>Unser Modell:</strong> Im Gegenzug bitten wir um einen 4-jährigen Kooperationsvertrag mit einer Vermittlungsprovision von 25% bei Dolmetschtätigkeiten sowie Festpreisen bei Übersetzungen.</p>
<p>Im Anhang finden Sie unser Hinweisblatt mit allen Details. Haben Sie Fragen? Ich stehe gerne zur Verfügung.</p>
<p>Mit freundlichen Grüßen,<br>{{ansprechpartner_name}}<br>speak2</p>`,
      triggerStatus: 'analyzed' as const,
      autoSend: false,
    },
    {
      slug: 'followup_outline_1',
      name: 'Nachfassung Outline #1 (sanft)',
      description: 'Automatische sanfte Nachfassung 5 Tage nach Outline-Versand',
      subjectTmpl: 'Rückfrage: Ermächtigung {{sprache}} — haben Sie Fragen?',
      bodyHtmlTmpl: `<p>Sehr geehrte/r {{kandidat_name}},</p>
<p>vor einigen Tagen haben wir Ihnen Informationen zu einer möglichen Zusammenarbeit zugesandt.</p>
<p>Haben Sie die Gelegenheit gehabt, diese durchzulesen? Ich beantworte gerne alle Fragen.</p>
<p>Mit freundlichen Grüßen,<br>{{ansprechpartner_name}}<br>speak2</p>`,
      triggerStatus: 'outline_sent' as const,
      autoSend: true,
    },
    {
      slug: 'contract_cover',
      name: 'Vertragsübersendung',
      description: 'Kooperationsvertrag zum Unterzeichnen',
      subjectTmpl: 'Kooperationsvertrag speak2 — {{kandidat_name}}',
      bodyHtmlTmpl: `<p>Sehr geehrte/r {{kandidat_name}},</p>
<p>ich freue mich, Ihnen hiermit unseren Kooperationsvertrag zukommen zu lassen.</p>
<p>Bitte prüfen Sie den Vertrag und senden Sie uns die unterschriebene Version bis zum <strong>{{datum}}</strong> zurück.</p>
<p>Bei Fragen stehe ich selbstverständlich zur Verfügung.</p>
<p>Mit freundlichen Grüßen,<br>{{ansprechpartner_name}}<br>speak2</p>`,
      triggerStatus: 'contract_sent' as const,
      autoSend: false,
    },
    {
      slug: 'welcome_signed',
      name: 'Willkommen — Vertrag unterzeichnet',
      description: 'Willkommens-E-Mail nach Vertragsunterzeichnung mit nächsten Schritten',
      subjectTmpl: 'Willkommen bei speak2! Nächste Schritte zur Ermächtigung',
      bodyHtmlTmpl: `<p>Sehr geehrte/r {{kandidat_name}},</p>
<p>herzlichen Glückwunsch! Ihr Kooperationsvertrag liegt uns nun unterschrieben vor.</p>
<p>Wir freuen uns auf die Zusammenarbeit und starten jetzt den Ermächtigungsprozess.</p>
<p><strong>Nächste Schritte:</strong><br>
Wir werden in Kürze auf Sie zukommen mit einer Liste der benötigten Unterlagen für die Einreichung beim {{gericht_name}}.</p>
<p>Mit freundlichen Grüßen,<br>{{ansprechpartner_name}}<br>speak2</p>`,
      triggerStatus: 'contract_signed' as const,
      autoSend: true,
    },
    {
      slug: 'certification_congratulations',
      name: 'Glückwunsch zur Zertifizierung',
      description: 'Gratulation nach erfolgter Ermächtigung',
      subjectTmpl: '🎉 Herzlichen Glückwunsch — Sie sind ermächtigt!',
      bodyHtmlTmpl: `<p>Sehr geehrte/r {{kandidat_name}},</p>
<p>wir freuen uns sehr, Ihnen mitteilen zu können, dass Ihre Ermächtigung als <strong>{{sprache}}</strong>-Übersetzer/in erfolgreich abgeschlossen wurde!</p>
<p>Sie sind nun offiziell ermächtigte/r Übersetzer/in und können Aufträge von Gerichten, Behörden und anderen Institutionen annehmen.</p>
<p>Wir werden Ihnen in Kürze Ihren ersten Auftrag vermitteln.</p>
<p>Herzliche Glückwünsche und auf eine erfolgreiche Zusammenarbeit!<br>{{ansprechpartner_name}}<br>speak2</p>`,
      triggerStatus: 'certified' as const,
      autoSend: false,
    },
  ]

  for (const tmpl of templates) {
    await prisma.emailTemplate.upsert({
      where: { slug: tmpl.slug },
      update: tmpl,
      create: tmpl,
    })
  }

  console.log('✅ Email templates created (5 templates)')

  console.log('')
  console.log('🎉 Seed complete!')
  console.log('')
  console.log('👤 Users:')
  console.log('   Admin: info@speak2.de (Ramón Hansmeyer)')
  console.log('   Staff: thomas@speak2.de (Thomas Schlegtendal)')
  console.log('')
  console.log('📋 Next: Add your 12 candidates via the app or run the migration script')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
