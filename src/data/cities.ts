export type City = {
  slug: string;
  name: string;
  region: string;
  areas: string[];
  intro: string;
  regionalNote: string;
  planningNote: string;
  seoTitle?: string;
  seoDescription?: string;
  storyHrefs?: string[];
  localGuide?: {
    eyebrow: string;
    title: string;
    lead: string;
    sections: Array<{ title: string; text: string }>;
    faq?: { question: string; answer: string };
  };
};

export const cities: City[] = [
  {
    slug: 'berlin',
    name: 'Berlin',
    region: 'Berlin und Brandenburg',
    areas: ['Mitte', 'Pankow', 'Charlottenburg', 'Neukölln', 'Steglitz-Zehlendorf', 'Brandenburg'],
    intro: 'Unser Sitz ist in Berlin. Auch hier ist der einfachste erste Schritt eine Online-Anfrage: Sie zeigen das Instrument mit wenigen Fotos und vermeiden einen unnötigen Transport durch die Stadt.',
    regionalNote: 'Ob das Instrument in einer Berliner Wohnung, einem Proberaum oder im Umland steht, ist für die erste Prüfung nicht entscheidend. Wichtig sind eine Gesamtansicht, erkennbare Details und alles, was zum Instrument gehört.',
    planningNote: 'Nach der persönlichen Sichtung lässt sich gezielt besprechen, welcher nächste Schritt in Berlin sinnvoll ist.',
    seoTitle: 'Musikinstrumente Ankauf Berlin – Instrument verkaufen',
    seoDescription: 'Musikinstrument in Berlin verkaufen: Geige, Cello, Kontrabass, Bogen oder Nachlass zuerst per Foto zeigen und persönlich prüfen lassen.',
    storyHrefs: [
      '/instrumentengeschichten/johannes-rubner-1967/',
      '/instrumentengeschichten/august-rau-geigenbogen-um-1910/'
    ],
    localGuide: {
      eyebrow: 'Sitz in Berlin',
      title: 'Ein Instrument muss für den ersten Eindruck nicht durch die Stadt.',
      lead: 'Berlin ist unser tatsächlicher Sitz – dennoch beginnt auch eine Berliner Anfrage bewusst online. So bleibt das Instrument zunächst dort, wo es sicher steht, und eine Übergabe wird erst vereinbart, wenn die Fotos eine sinnvolle Grundlage geschaffen haben.',
      sections: [
        {
          title: 'Wohnung, Proberaum oder Keller',
          text: 'Gerade Celli und Kontrabässe werden nicht selten in oberen Etagen, engen Altbauten oder Proberäumen aufbewahrt. Für die erste Prüfung ist es besser, das Instrument am Standort vollständig zu fotografieren, als es vorschnell durch Treppenhaus und Stadtverkehr zu bewegen.'
        },
        {
          title: 'Berliner Nachlässe zusammenhalten',
          text: 'Bei einer Wohnungsauflösung sollten Bögen, Koffer, Rechnungen und handschriftliche Notizen zunächst beim Instrument bleiben. Der Johannes-Rubner-Kontrabass auf dieser Seite wurde selbst bei einer Berliner Wohnungsauflösung gefunden und zeigt, wie wichtig solche Zusammenhänge sein können.'
        },
        {
          title: 'Übergabe nur nach Abstimmung',
          text: 'Die im Impressum genannte Anschrift ist keine unangemeldete Annahmestelle. Nach der persönlichen Foto-Prüfung besprechen wir, ob weitere Ansichten, eine Begutachtung oder eine vereinbarte Übergabe in Berlin der passende nächste Schritt sind.'
        }
      ],
      faq: {
        question: 'Kann ich ein Instrument direkt in Berlin vorbeibringen?',
        answer: 'Bitte starten Sie zuerst mit der Online-Anfrage. Eine Übergabe oder Begutachtung in Berlin wird nur nach vorheriger Sichtung und persönlicher Terminabstimmung vereinbart.'
      }
    }
  },
  {
    slug: 'bremen',
    name: 'Bremen',
    region: 'Bremen und Nordwestdeutschland',
    areas: ['Bremen-Mitte', 'Schwachhausen', 'Findorff', 'Vegesack', 'Bremerhaven', 'Oldenburg'],
    intro: 'Von Bremen bis Bremerhaven oder Oldenburg beginnt die Anfrage online. So müssen empfindliche oder schwere Instrumente nicht allein für einen ersten Eindruck transportiert werden.',
    regionalNote: 'Im Nordwesten liegen Stadt und Umland oft weit auseinander. Fotos von Instrument, Bögen, Koffer und vorhandenen Unterlagen schaffen deshalb zuerst eine gemeinsame Grundlage, ganz ohne Anfahrt.',
    planningNote: 'Erst nach der Foto-Prüfung wird individuell geklärt, ob und wie eine weitere Begutachtung oder Übergabe sinnvoll ist.'
  },
  {
    slug: 'dortmund',
    name: 'Dortmund',
    region: 'Dortmund und das östliche Ruhrgebiet',
    areas: ['Innenstadt', 'Hombruch', 'Hörde', 'Aplerbeck', 'Bochum', 'Unna'],
    intro: 'Für Instrumente aus Dortmund und dem östlichen Ruhrgebiet reicht im ersten Schritt eine Foto-Anfrage. Sie können auch mehrere zusammengehörige Stücke in einer Anfrage zeigen.',
    regionalNote: 'Da die Städte im Ruhrgebiet eng ineinander übergehen, zählt nicht die genaue Stadtgrenze, sondern eine gut dokumentierte Anfrage. Zeigen Sie bei Nachlässen auch Bögen, Etiketten, Rechnungen und Koffer.',
    planningNote: 'Der weitere Ablauf wird nach der persönlichen Prüfung passend zum Instrument und seinem Standort abgestimmt.'
  },
  {
    slug: 'dresden',
    name: 'Dresden',
    region: 'Dresden und das Elbland',
    areas: ['Altstadt', 'Neustadt', 'Blasewitz', 'Plauen', 'Radebeul', 'Meißen'],
    intro: 'Ein Instrument aus Dresden oder dem Elbland können Sie zunächst vollständig online zeigen. Das ist besonders praktisch, wenn Herkunft, Hersteller oder Alter noch unklar sind.',
    regionalNote: 'Zwischen Dresden, Radebeul und Meißen können Instrumente aus privatem Besitz, Musikschulen oder Nachlässen auftauchen. Für uns ist entscheidend, was auf den Fotos erkennbar ist – nicht, ob Sie Fachbegriffe kennen.',
    planningNote: 'Nach der Sichtung erhalten Sie eine persönliche Rückmeldung zum sinnvollen weiteren Vorgehen.'
  },
  {
    slug: 'duesseldorf',
    name: 'Düsseldorf',
    region: 'Düsseldorf und die Rheinregion',
    areas: ['Stadtmitte', 'Pempelfort', 'Bilk', 'Oberkassel', 'Neuss', 'Ratingen'],
    intro: 'Instrumente aus Düsseldorf, Neuss oder Ratingen können Sie mit wenigen Fotos online anbieten. Für den Anfang brauchen Sie weder eine genaue Bezeichnung noch eine eigene Werteinschätzung.',
    regionalNote: 'In der dicht besiedelten Rheinregion spart die Foto-Anfrage unnötige Wege. Fotografieren Sie das Instrument bei Tageslicht und legen Sie Bögen, Koffer oder Dokumente dazu, wenn sie gemeinsam aufbewahrt wurden.',
    planningNote: 'Eine mögliche Übergabe wird erst nach der persönlichen Prüfung und passend zum Einzelfall besprochen.'
  },
  {
    slug: 'duisburg',
    name: 'Duisburg',
    region: 'Duisburg, Niederrhein und westliches Ruhrgebiet',
    areas: ['Mitte', 'Rheinhausen', 'Homberg', 'Meiderich', 'Moers', 'Oberhausen'],
    intro: 'Aus Duisburg und vom Niederrhein können Sie Ihr Musikinstrument zuerst per Foto zeigen. Das gilt für einzelne Instrumente ebenso wie für Bögen, Zubehör oder einen ganzen Nachlass.',
    regionalNote: 'Zwischen Niederrhein und Ruhrgebiet sind Entfernungen auf der Karte kurz, ein sicherer Instrumententransport kann trotzdem aufwendig sein. Deshalb wird zunächst online geprüft, welche Details und Unterlagen vorhanden sind.',
    planningNote: 'Alles Weitere richtet sich nach Instrument, Zustand und Standort und wird persönlich mit Ihnen abgestimmt.'
  },
  {
    slug: 'essen',
    name: 'Essen',
    region: 'Essen und das mittlere Ruhrgebiet',
    areas: ['Stadtmitte', 'Rüttenscheid', 'Werden', 'Borbeck', 'Mülheim', 'Gelsenkirchen'],
    intro: 'Wer in Essen oder im mittleren Ruhrgebiet ein Instrument verkaufen möchte, kann den ersten Schritt bequem online erledigen. Einige übersichtliche Fotos reichen zum Start.',
    regionalNote: 'Gerade bei Instrumenten aus Familienbesitz ist oft nicht bekannt, ob Etiketten, Stempel oder alte Reparaturzettel wichtig sind. Fotografieren Sie solche Hinweise einfach mit – Sie müssen sie nicht selbst einordnen.',
    planningNote: 'Nach der persönlichen Sichtung wird geklärt, welche Ergänzungen oder nächsten Schritte tatsächlich nötig sind.',
    seoTitle: 'Musikinstrumente Ankauf Essen – Instrument verkaufen',
    seoDescription: 'Musikinstrument in Essen oder im Ruhrgebiet verkaufen: Fotos von Geige, Cello, Kontrabass, Bogen oder Nachlass senden und persönlich prüfen lassen.',
    storyHrefs: ['/instrumentengeschichten/albert-volkmann-1908/'],
    localGuide: {
      eyebrow: 'Eine belegbare Verbindung zu Essen',
      title: 'Ein historischer Kontrabass verbindet diese Seite tatsächlich mit der Stadt.',
      lead: 'Der Albert-Volkmann-Kontrabass von 1908 befand sich nach der Überlieferung im Besitz eines Berufsmusikers in Essen. Seine Geschichte ist nicht bloß ein ausgetauschter Stadtname, sondern ein konkretes Beispiel dafür, welche Wege ein professionell gespieltes Instrument nehmen kann.',
      sections: [
        {
          title: 'Musikerbesitz und Familiengeschichte',
          text: 'Bei Instrumenten aus Essen und dem Ruhrgebiet treffen berufliche Nutzung, private Aufbewahrung und familiäre Überlieferung häufig aufeinander. Namen von Orchestern, alte Programme, Reparaturbelege oder ein handschriftlicher Hinweis können deshalb genauso wichtig sein wie der Werkstattzettel im Instrument.'
        },
        {
          title: 'Große Instrumente zuerst am Standort zeigen',
          text: 'Ein Kontrabass sollte für eine erste Einschätzung nicht zwischen Essen, Mülheim oder Gelsenkirchen transportiert werden. Fotografieren Sie Vorderseite, Rücken, Schnecke, Zettel, Lack und sichtbare Schäden dort, wo der Bass sicher aufgestellt werden kann.'
        },
        {
          title: 'Überlieferung klar kennzeichnen',
          text: 'Nicht jede Familiengeschichte lässt sich später beweisen. Schreiben Sie trotzdem auf, was erzählt wurde, und kennzeichnen Sie Unsicheres als Erinnerung. Beim Volkmann-Bass werden sichtbare Merkmale, historische Quellen und mündliche Überlieferung bewusst voneinander getrennt.'
        }
      ],
      faq: {
        question: 'Gibt es eine Annahmestelle in Essen?',
        answer: 'Nein. Die erste Prüfung erfolgt online. Ob nach der Sichtung eine Begutachtung, Abholung oder andere Übergabe sinnvoll ist, wird persönlich für das konkrete Instrument abgestimmt.'
      }
    }
  },
  {
    slug: 'frankfurt',
    name: 'Frankfurt am Main',
    region: 'Frankfurt und das Rhein-Main-Gebiet',
    areas: ['Innenstadt', 'Sachsenhausen', 'Bornheim', 'Westend', 'Offenbach', 'Wiesbaden'],
    intro: 'Für Instrumente aus Frankfurt und dem Rhein-Main-Gebiet beginnt der Ankauf mit einer Online-Anfrage. So erhalten wir die nötigen Ansichten, bevor ein Transport überhaupt zum Thema wird.',
    regionalNote: 'Das Rhein-Main-Gebiet reicht weit über Frankfurt hinaus. Ob das Instrument in Offenbach, Wiesbaden oder in der Stadt steht, ändert nichts am ersten Schritt: Gesamtansicht, Details und vorhandenes Zubehör fotografieren.',
    planningNote: 'Nach der Prüfung besprechen wir individuell, wie der weitere Kontakt am sinnvollsten organisiert wird.'
  },
  {
    slug: 'hamburg',
    name: 'Hamburg',
    region: 'Hamburg und die Metropolregion',
    areas: ['Altona', 'Eimsbüttel', 'Wandsbek', 'Harburg', 'Norderstedt', 'Lübeck'],
    intro: 'In Hamburg und dem Umland können Sie ein Instrument zunächst online anbieten. Damit entfällt für die erste Prüfung eine Fahrt quer durch die Stadt, über die Elbe oder aus der Metropolregion.',
    regionalNote: 'Bei großen Instrumenten oder kompletten Nachlässen ist ein vorschneller Transport besonders unpraktisch. Zeigen Sie deshalb zunächst alles am Standort – auch Koffer, Bögen und Papiere, die dazugehören könnten.',
    planningNote: 'Ob später eine persönliche Begutachtung oder andere Übergabe sinnvoll ist, wird nach der Foto-Prüfung geklärt.',
    seoTitle: 'Musikinstrumente Ankauf Hamburg – Instrument verkaufen',
    seoDescription: 'Musikinstrument in Hamburg verkaufen: Geige, Cello, Kontrabass, Bogen oder Nachlass aus Hamburg und der Metropolregion per Foto anbieten.',
    localGuide: {
      eyebrow: 'Hamburg und die Metropolregion',
      title: 'Erst dokumentieren, bevor ein großes Instrument durch Hamburg fährt.',
      lead: 'Zwischen Altona, Wandsbek, Harburg und dem Umland können schon kurze Entfernungen einen aufwendigen Instrumententransport bedeuten. Die Foto-Anfrage trennt die notwendige Dokumentation von einer späteren Übergabe und verhindert unnötige Wege.',
      sections: [
        {
          title: 'Kontrabass und Cello sicher fotografieren',
          text: 'Stellen Sie große Instrumente nur dort auf, wo ausreichend Platz und ein sicherer Hintergrund vorhanden sind. Eine vollständige Vorder- und Rückansicht, der Kopf sowie erkennbare Zettel reichen zunächst aus. Für die Anfrage ist weder eine Fahrt über die Elbe noch in die Innenstadt notwendig.'
        },
        {
          title: 'Anfragen aus dem Umland gehören dazu',
          text: 'Auch Instrumente aus Norderstedt, Lübeck oder anderen Orten der Metropolregion beginnen mit demselben Online-Schritt. Der genaue Standort wird erst wichtig, wenn nach der persönlichen Sichtung ein sinnvoller weiterer Ablauf feststeht.'
        },
        {
          title: 'Nachlass nicht vorschnell aufteilen',
          text: 'Bei mehreren Instrumenten fotografieren Sie zuerst den gesamten Bestand. Bögen, Koffer und Unterlagen sollten nicht nach vermutetem Wert getrennt werden: Ein unscheinbarer Stempel oder eine alte Rechnung kann die Zuordnung später wesentlich erleichtern.'
        }
      ],
      faq: {
        question: 'Kann ich auch aus dem Hamburger Umland anfragen?',
        answer: 'Ja. Der erste Schritt erfolgt vollständig online. Geben Sie Ihren Standort freiwillig mit an; eine mögliche Übergabe wird erst nach der Foto-Prüfung individuell geplant.'
      }
    }
  },
  {
    slug: 'hannover',
    name: 'Hannover',
    region: 'Hannover und die Region',
    areas: ['Mitte', 'List', 'Linden', 'Südstadt', 'Langenhagen', 'Hildesheim'],
    intro: 'Ein Musikinstrument aus Hannover oder der Region können Sie ohne Vorwissen online zeigen. Sie werden durch die wichtigsten Fotos geführt und können unbekannte Angaben einfach auslassen.',
    regionalNote: 'Die Region Hannover umfasst Stadt und weitläufiges Umland. Eine vollständige Foto-Anfrage verhindert unnötige Wege und zeigt zugleich, ob Etiketten, Stempel, Bögen oder Unterlagen näher angesehen werden sollten.',
    planningNote: 'Der nächste Schritt wird erst danach persönlich und passend zum jeweiligen Standort geplant.'
  },
  {
    slug: 'koeln',
    name: 'Köln',
    region: 'Köln und das Rheinland',
    areas: ['Innenstadt', 'Ehrenfeld', 'Lindenthal', 'Nippes', 'Leverkusen', 'Bonn'],
    intro: 'Instrumente aus Köln und dem Rheinland können Sie im ersten Schritt mit Fotos anbieten. Hersteller, Alter oder Wert müssen Sie dafür nicht selbst bestimmen können.',
    regionalNote: 'Zwischen Köln, Leverkusen und Bonn ist die Region gut verbunden, empfindliche Instrumente sollten trotzdem nicht unnötig bewegt werden. Gute Bilder liefern zuerst die Informationen, die für eine persönliche Prüfung zählen.',
    planningNote: 'Anschließend wird individuell besprochen, ob noch Details fehlen und wie es weitergehen kann.'
  },
  {
    slug: 'leipzig',
    name: 'Leipzig',
    region: 'Leipzig, Halle und Umgebung',
    areas: ['Zentrum', 'Südvorstadt', 'Plagwitz', 'Gohlis', 'Markkleeberg', 'Halle (Saale)'],
    intro: 'Aus Leipzig, Halle und der Umgebung können Sie einzelne Instrumente oder einen Nachlass online vorstellen. Bereits wenige klare Fotos schaffen eine gute Grundlage für die persönliche Prüfung.',
    regionalNote: 'Musikinstrumente werden häufig zusammen mit Bögen, Koffern, Notizen oder alten Belegen aufbewahrt. Fotografieren Sie diese Dinge mit, auch wenn Sie ihre Bedeutung nicht einschätzen können.',
    planningNote: 'Nach der Sichtung wird der weitere Ablauf ohne unnötige Wege und passend zum Instrument abgestimmt.'
  },
  {
    slug: 'muenchen',
    name: 'München',
    region: 'München und Oberbayern',
    areas: ['Altstadt-Lehel', 'Schwabing', 'Bogenhausen', 'Sendling', 'Landkreis München', 'Augsburg'],
    intro: 'Für Instrumente aus München und Oberbayern bietet die Online-Anfrage einen unkomplizierten Start. Auch große oder empfindliche Stücke können zunächst dort bleiben, wo sie sicher stehen.',
    regionalNote: 'Im Münchner Umland können die Wege schnell lang werden. Zeigen Sie Instrument, Bögen, Koffer und Unterlagen deshalb zuerst gemeinsam per Foto; so lässt sich gezielt entscheiden, was noch wichtig ist.',
    planningNote: 'Eine mögliche Begutachtung oder Übergabe wird erst nach der persönlichen Prüfung individuell organisiert.'
  },
  {
    slug: 'nuernberg',
    name: 'Nürnberg',
    region: 'Nürnberg und die Metropolregion',
    areas: ['Altstadt', 'Gostenhof', 'Mögeldorf', 'Fürth', 'Erlangen', 'Bamberg'],
    intro: 'In Nürnberg, Fürth, Erlangen und der weiteren Metropolregion können Sie Ihr Instrument zunächst online anbieten. Einige Fotos genügen, um die Anfrage persönlich ansehen zu lassen.',
    regionalNote: 'Ob ein Instrument aus aktivem Musikerbesitz, vom Dachboden oder aus einem Nachlass stammt: Zeigen Sie auch Zubehör und Schriftstücke, die zusammen gefunden wurden. Eine eigene fachliche Einordnung ist nicht nötig.',
    planningNote: 'Nach der Prüfung lässt sich der nächste Schritt gezielt und passend zu Ihrem Standort abstimmen.'
  },
  {
    slug: 'stuttgart',
    name: 'Stuttgart',
    region: 'Stuttgart und die Region',
    areas: ['Mitte', 'Bad Cannstatt', 'Degerloch', 'Vaihingen', 'Ludwigsburg', 'Esslingen'],
    intro: 'Ein Instrument aus Stuttgart, Ludwigsburg oder Esslingen können Sie zuerst online zeigen. Damit bleibt es für die erste Prüfung sicher am Standort und Sie sparen eine unnötige Fahrt.',
    regionalNote: 'In der Stuttgarter Region liegen Stadtteile und Nachbarstädte nah beieinander, der Transport eines Cellos oder Kontrabasses bleibt dennoch aufwendig. Fotos helfen, den tatsächlichen nächsten Schritt zuerst einzugrenzen.',
    planningNote: 'Wie es danach weitergeht, wird persönlich, ohne pauschale Transportvorgabe und passend zum Instrument besprochen.',
    seoTitle: 'Musikinstrumente Ankauf Stuttgart – Instrument verkaufen',
    seoDescription: 'Musikinstrument in Stuttgart, Ludwigsburg oder Esslingen verkaufen: Fotos senden und Geige, Cello, Kontrabass, Bogen oder Nachlass prüfen lassen.',
    localGuide: {
      eyebrow: 'Stuttgart und die Region',
      title: 'Für die erste Prüfung entscheidet das Instrument – nicht der Anfahrtsweg.',
      lead: 'Stuttgart, Ludwigsburg und Esslingen liegen eng beieinander, doch ein empfindliches oder großes Streichinstrument lässt sich nicht wie gewöhnliches Gepäck bewegen. Deshalb wird zuerst geklärt, was vorhanden ist und ob ein weiterer Termin überhaupt nötig wird.',
      sections: [
        {
          title: 'Sicher am Standort beginnen',
          text: 'Ein Cello oder Kontrabass darf für die Fotos in Wohnung, Musikzimmer oder Proberaum bleiben. Wichtig ist eine freie Gesamtansicht; enge Winkel oder schwierige Lichtverhältnisse können später mit einzelnen Detailaufnahmen ausgeglichen werden.'
        },
        {
          title: 'Unterlagen aus Musikerbesitz mitzeigen',
          text: 'In einer Region mit Orchestern, Musikschulen und langem privatem Musikleben gelangen Instrumente häufig zusammen mit Bögen, Koffern oder Reparaturbelegen in einen Nachlass. Fotografieren Sie diese Dinge gemeinsam, bevor Sie eine Zuordnung vornehmen.'
        },
        {
          title: 'Ludwigsburg und Esslingen mitgedacht',
          text: 'Die Anfrage ist nicht auf die Stuttgarter Stadtgrenze beschränkt. Für Instrumente aus Ludwigsburg, Esslingen und dem weiteren Umland gilt derselbe Ablauf: erst vollständig zeigen, dann nach der persönlichen Prüfung den passenden nächsten Schritt organisieren.'
        }
      ],
      faq: {
        question: 'Muss ich für die Prüfung nach Stuttgart fahren?',
        answer: 'Nein. Fotos und vorhandene Informationen genügen für den ersten Schritt. Ob später eine Begutachtung oder Übergabe sinnvoll ist, wird erst danach individuell geklärt.'
      }
    }
  }
];

export const cityBySlug = Object.fromEntries(cities.map((city) => [city.slug, city]));
