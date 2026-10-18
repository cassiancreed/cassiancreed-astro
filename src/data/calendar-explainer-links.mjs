// NEP-20261018-CAL-04: reviewed case matches shared by every calendar surface.
// Only live, priced products and non-archived published posts are eligible.
// Source dates, court times, notes and legal posture remain in the original TSVs.
const EXISTING_CASE_GUIDES = {
  'burke-prelim': {
    url: 'https://cassiancreed.beehiiv.com/products/celeste-rivas-hernandez-d4vd-charges-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_d4vd_v2&utm_content=status_entry',
    text: 'Read the Celeste Rivas Hernandez case guide — the D4vd charges explained — $1.99',
    bookKey: 'celeste-rivas-hernandez-d4vd-charges-guide',
    placement: 'court_calendar_d4vd_status_entry',
  },
  'parker-smith-first-appearance': [{
    url: 'https://cassiancreed.beehiiv.com/products/michelle-parker-case-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_parker_v1&utm_content=first_appearance_entry',
    text: 'Get the full Michelle Parker case guide — timeline, Florida no-body law, what comes next — $1.99',
    bookKey: 'michelle-parker-case-guide',
    placement: 'court_calendar_parker_first_appearance_entry',
  }, {
    url: 'https://cassiancreed.beehiiv.com/products/both-sides-michelle-parker-no-body-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_parker_bothsides_v2&utm_content=first_appearance_entry',
    text: 'Both Sides of the Story: Michelle Parker — can there be a murder case with no body? — $1.99',
    bookKey: 'both-sides-michelle-parker-no-body-guide',
    placement: 'court_calendar_parker_bothsides_first_appearance_entry',
  }],
  'parker-smith-bond-hearing': [{
    url: 'https://cassiancreed.beehiiv.com/products/michelle-parker-case-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_parker_v1&utm_content=bond_hearing_entry',
    text: 'Get the full Michelle Parker case guide — timeline, Florida no-body law, what comes next — $1.99',
    bookKey: 'michelle-parker-case-guide',
    placement: 'court_calendar_parker_bond_hearing_entry',
  }, {
    url: 'https://cassiancreed.beehiiv.com/products/both-sides-michelle-parker-no-body-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_parker_bothsides_v2&utm_content=bond_hearing_entry',
    text: 'Both Sides of the Story: Michelle Parker — can there be a murder case with no body? — $1.99',
    bookKey: 'both-sides-michelle-parker-no-body-guide',
    placement: 'court_calendar_parker_bothsides_bond_hearing_entry',
  }],
  'pike-execution': {
    url: 'https://cassiancreed.beehiiv.com/products/christa-pike-failed-execution-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_pike_v1&utm_content=next_step_entry',
    text: 'Get the full Christa Pike case guide — timeline, every court step, six paths ahead — $1.99',
    bookKey: 'christa-pike-failed-execution-guide',
    placement: 'court_calendar_pike_next_step_entry',
  },
  'pike-stay-denial-sep23': {
    url: 'https://cassiancreed.beehiiv.com/products/christa-pike-failed-execution-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_pike_v1&utm_content=stay_denial_entry',
    text: 'Get the full Christa Pike case guide — timeline, every court step, six paths ahead — $1.99',
    bookKey: 'christa-pike-failed-execution-guide',
    placement: 'court_calendar_pike_stay_denial_entry',
  },
  'pike-clemency-denial-sep28': {
    url: 'https://cassiancreed.beehiiv.com/products/christa-pike-failed-execution-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_pike_v1&utm_content=clemency_entry',
    text: 'Get the full Christa Pike case guide — timeline, every court step, six paths ahead — $1.99',
    bookKey: 'christa-pike-failed-execution-guide',
    placement: 'court_calendar_pike_clemency_entry',
  },
  'mangione-state-double-jeopardy-hearing': {
    url: 'https://cassiancreed.beehiiv.com/products/brian-thompson-luigi-mangione-two-courts?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_luigi_v1&utm_content=state_entry',
    text: 'Understand the Brian Thompson case and its two-court collision — $1.99',
    bookKey: 'brian-thompson-luigi-mangione-two-courts',
    placement: 'court_calendar_mangione_state_entry',
  },
  'mangione-federal-sentencing': {
    url: 'https://cassiancreed.beehiiv.com/products/brian-thompson-luigi-mangione-two-courts?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_luigi_v1&utm_content=federal_entry',
    text: 'Understand the Brian Thompson case and its two-court collision — $1.99',
    bookKey: 'brian-thompson-luigi-mangione-two-courts',
    placement: 'court_calendar_mangione_federal_entry',
  },
  'clancy-november-motions': {
    url: 'https://cassiancreed.beehiiv.com/products/lindsay-clancy-post-mistrial-field-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_clancy_v1&utm_content=november_entry',
    text: 'Read the Cora, Dawson and Callan post-mistrial field guide — $1.99',
    bookKey: 'lindsay-clancy-post-mistrial-field-guide',
    placement: 'court_calendar_clancy_november_entry',
  },
  'clancy-status-hearing': {
    url: 'https://cassiancreed.beehiiv.com/products/lindsay-clancy-post-mistrial-field-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_clancy_v1&utm_content=status_entry',
    text: 'Read the Cora, Dawson and Callan post-mistrial field guide — $1.99',
    bookKey: 'lindsay-clancy-post-mistrial-field-guide',
    placement: 'court_calendar_clancy_status_entry',
  },
  'clancy-trial': {
    url: 'https://cassiancreed.beehiiv.com/products/lindsay-clancy-post-mistrial-field-guide?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=explainer_clancy_v1&utm_content=mistrial_entry',
    text: 'Read the Cora, Dawson and Callan post-mistrial field guide — $1.99',
    bookKey: 'lindsay-clancy-post-mistrial-field-guide',
    placement: 'court_calendar_clancy_mistrial_entry',
  },
  'banks-federal-trial': {
    url: 'https://cassiancreed.beehiiv.com/products/jury-chess?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=jury_chess&utm_content=lil_durk_verdict_entry',
    text: 'Learn how criminal jury verdicts work — and what they do not decide. Get Jury Chess — $5.99',
    bookKey: 'jury-chess',
    placement: 'court_calendar_lil_durk_verdict_entry',
  },
  'patterson-appeal': {
    url: 'https://cassiancreed.beehiiv.com/products/case-chess-erin-patterson',
    text: 'Read the Erin Patterson case explainer — $2.99',
    bookKey: 'case-chess-erin-patterson',
    placement: 'court_calendar_case_guide',
  },
};

export const CALENDAR_EXPLAINER_CASES = [
  {
    "key": "parker",
    "entryIds": [
      "parker-smith-first-appearance",
      "parker-smith-bond-hearing"
    ],
    "free": [
      {
        "url": "/post/michelle-parker-case-dale-smith-charged-no-body/",
        "text": "The Michelle Parker Case: How Can There Be a Murder Charge When She Has Never Been Found?"
      }
    ],
    "paid": [
      "michelle-parker-case-guide",
      "both-sides-michelle-parker-no-body-guide"
    ]
  },
  {
    "key": "pike",
    "entryIds": [
      "pike-execution",
      "pike-stay-denial-sep23",
      "pike-clemency-denial-sep28"
    ],
    "free": [
      {
        "url": "/post/christa-pike-failed-execution-what-happens-next/",
        "text": "Christa Pike Case: What Happens After a Failed Execution?"
      }
    ],
    "paid": [
      "christa-pike-failed-execution-guide"
    ]
  },
  {
    "key": "clancy",
    "entryIds": [
      "clancy-trial",
      "clancy-status-hearing",
      "clancy-november-motions"
    ],
    "free": [
      {
        "url": "/post/lindsay-clancy-trial/",
        "text": "Lindsay Clancy trial tracker: Mistrial, pending charges and next hearing"
      },
      {
        "url": "/post/lindsay-clancy-trial-2026-postpartum-psychosis/",
        "text": "Postpartum psychosis and criminal responsibility: A careful guide to the Lindsay Clancy case"
      },
      {
        "url": "/post/lindsay-clancy-trial-postpartum-mental-health-legal-nexus/",
        "text": "The Legal Nexus of Postpartum Mental Health: An Investigative Report on the Lindsay Clancy Trial"
      },
      {
        "url": "/post/the-lindsay-clancy-case-three-children-one-trial-and-the-questions-massachusetts-must-answer/",
        "text": "The Lindsay Clancy Case: Three Children, One Trial, and the Questions Massachusetts Must Answer"
      },
      {
        "url": "/post/ngri-massachusetts-explainer/",
        "text": "'Not Criminally Responsible' Does Not Mean Walking Free: What the Verdict Actually Triggers in Massachusetts"
      },
      {
        "url": "/post/what-actually-happens-on-day-one-of-a-high-profile-trial/",
        "text": "What Actually Happens on Day One of a High-Profile Trial"
      }
    ],
    "paid": [
      "lindsay-clancy-post-mistrial-field-guide"
    ]
  },
  {
    "key": "murdaugh",
    "entryIds": [
      "murdaugh-retrial",
      "murdaugh-nov13-hearing",
      "murdaugh-venue-reserved"
    ],
    "free": [
      {
        "url": "/post/the-murdaugh-murders-how-alex-murdaugh-was-convicted-and-why-he-now-faces-a-new-trial/",
        "text": "The Murdaugh Murders: How Alex Murdaugh Was Convicted — and Why He Now Faces a New Trial"
      }
    ],
    "paid": [
      "murdaugh-retrial-guide"
    ]
  },
  {
    "key": "tupac",
    "entryIds": [
      "davis-tupac-openings"
    ],
    "free": [
      {
        "url": "/post/why-was-keffe-d-convicted-tupac-shakur/",
        "text": "Tupac Case: What Keffe D’s Reported Sentence Means"
      }
    ],
    "paid": [
      "tupac-shakur-keffe-d-case-guide"
    ]
  },
  {
    "key": "anthony",
    "entryIds": [
      "anthony-recusal",
      "anthony-new-trial"
    ],
    "free": [
      {
        "url": "/post/a-jury-convicted-a-family-still-grieves-karmelo-anthony-verdict-austin-metcalf/",
        "text": "A Jury Convicted. A Family Still Grieves. The Trial of Karmelo Anthony Is Over — What Comes Next for Austin Metcalf's Case."
      }
    ],
    "paid": [
      "austin-metcalf-karmelo-anthony-case-guide"
    ]
  },
  {
    "key": "dominguez",
    "entryIds": [
      "dominguez-placement"
    ],
    "free": [
      {
        "url": "/post/what-a-racial-justice-act-violation-means-dominguez/",
        "text": "What a Racial Justice Act Violation Means in the Dominguez Retrial"
      }
    ],
    "paid": []
  },
  {
    "key": "peck",
    "entryIds": [
      "peck-pretrial"
    ],
    "free": [
      {
        "url": "/post/baby-boy-doe-mansfield-1985/",
        "text": "Baby Boy Doe Case Update: Dianne Curry Peck and DNA"
      }
    ],
    "paid": []
  },
  {
    "key": "millete",
    "entryIds": [
      "millete-sentencing"
    ],
    "free": [
      {
        "url": "/post/the-maya-millete-case-larry-milletes-no-body-murder-trial-explained/",
        "text": "The Maya Millete Case: Larry Millete's 'No-Body' Murder Trial, Explained"
      }
    ],
    "paid": []
  },
  {
    "key": "d4vd",
    "entryIds": [
      "burke-prelim"
    ],
    "free": [
      {
        "url": "/post/what-happens-at-d4vds-monday-hearing/",
        "text": "What Happens at D4vd's Monday Hearing"
      }
    ],
    "paid": [
      "celeste-rivas-hernandez-d4vd-charges-guide"
    ]
  },
  {
    "key": "bridegan",
    "entryIds": [
      "gardner-pretrial-2026-10-27",
      "gardner-jury-selection",
      "gardner-trial",
      "bridegan-fernandez-trial"
    ],
    "free": [],
    "paid": [
      "jared-bridegan-case-guide-v2"
    ]
  },
  {
    "key": "delphi",
    "entryIds": [
      "allen-appeal-argument"
    ],
    "free": [
      {
        "url": "/post/the-delphi-murders-how-libby-german-s-own-phone-helped-convict-richard-allen/",
        "text": "The Delphi Murders: How Libby German's Own Phone Helped Convict Richard Allen"
      }
    ],
    "paid": []
  },
  {
    "key": "irasema",
    "entryIds": [
      "unconfirmed-2"
    ],
    "free": [
      {
        "url": "/post/irasema-chavez-mayra-velasquez-arlington-cold-case/",
        "text": "Irasema Chavez Case: Mayra Velasquez Charged in 2012 Arlington Killing"
      }
    ],
    "paid": []
  },
  {
    "key": "taylor-parker",
    "entryIds": [
      "unconfirmed-3"
    ],
    "free": [
      {
        "url": "/post/the-taylor-parker-case-the-murder-of-reagan-simmons-hancock-and-where-it-stands-now/",
        "text": "The Taylor Parker Case: The Murder of Reagan Simmons-Hancock and Where It Stands Now"
      },
      {
        "url": "/post/maternal-instinct-netflix-forensic-evidence-taylor-parker/",
        "text": "What the Evidence in Maternal Instinct Actually Shows"
      }
    ],
    "paid": []
  },
  {
    "key": "etan-patz",
    "entryIds": [
      "unconfirmed-4"
    ],
    "free": [
      {
        "url": "/post/etan-patz-supreme-court-2026-conviction-reinstated/",
        "text": "Etan Patz — SCOTUS Reinstates Pedro Hernandez Conviction"
      }
    ],
    "paid": []
  },
  {
    "key": "kohberger",
    "entryIds": [
      "unconfirmed-6",
      "kohberger-disqualification-hearing"
    ],
    "free": [
      {
        "url": "/post/what-happened-in-the-idaho-student-murders-the-bryan-kohberger-case-explained/",
        "text": "The Idaho Student Murders: How Bryan Kohberger Was Caught, Pleaded Guilty, and Was Sentenced"
      }
    ],
    "paid": []
  },
  {
    "key": "colt-gray",
    "entryIds": [
      "completed-1"
    ],
    "free": [
      {
        "url": "/post/colt-gray-hearing-what-a-non-negotiated-plea-means/",
        "text": "Colt Gray Hearing: What a Non-Negotiated Plea Means"
      }
    ],
    "paid": []
  },
  {
    "key": "melgar",
    "entryIds": [
      "completed-3"
    ],
    "free": [
      {
        "url": "/post/nestor-hernandez-melgar-lindsay-geary-case/",
        "text": "The Nestor Hernandez Melgar Case: What Happened to Lindsay Geary"
      },
      {
        "url": "/post/nestor-hernandez-melgar-sentencing/",
        "text": "Nestor Hernandez Melgar Sentencing: Life in Prison in the Lindsay Geary Case"
      },
      {
        "url": "/post/anatomy-of-a-murder-trial-hernandez-melgar/",
        "text": "Anatomy of a Murder Trial: Hernandez Melgar and the Evidence That Convicted Without DNA"
      },
      {
        "url": "/post/how-washington-courts-work-hernandez-melgar/",
        "text": "How Washington State Courts Work: The Hernandez Melgar Case Explained"
      },
      {
        "url": "/post/murder-staged-as-suicide-hernandez-melgar/",
        "text": "The Jury Said Murder. The Medical Examiner Said Undetermined. Here's How Prosecutors Won Anyway."
      }
    ],
    "paid": []
  },
  {
    "key": "mangione",
    "entryIds": [
      "mangione-state-double-jeopardy-hearing",
      "mangione-federal-sentencing"
    ],
    "free": [
      {
        "url": "/post/luigi-mangione-psychiatric-defense-withdrawn-trial-2026/",
        "text": "Read the Brian Thompson case explainer"
      }
    ],
    "paid": [
      "brian-thompson-luigi-mangione-two-courts"
    ]
  },
  {
    "key": "nancy",
    "entryIds": [
      "inv-nancy-guthrie"
    ],
    "free": [
      {
        "url": "/post/nancy-guthrie-case-update-verified-timeline/",
        "text": "Nancy Guthrie Case Update: The Verified Timeline and What Changed"
      },
      {
        "url": "/post/nancy-guthrie-abduction-what-we-know/",
        "text": "Nancy Guthrie Update: What We Know About the Tucson Abduction"
      },
      {
        "url": "/post/nancy-guthrie-arizona-federal-kidnapping-jurisdiction/",
        "text": "Why Arizona and the FBI Are Both Involved in the Nancy Guthrie Case"
      },
      {
        "url": "/post/nancy-guthrie-ransom-notes-what-they-reveal/",
        "text": "Nancy Guthrie Ransom Notes: What They Reveal—and What They Do Not Prove"
      }
    ],
    "paid": []
  },
  {
    "key": "daybell",
    "entryIds": [
      "vallow-idaho-appeal-argument",
      "chad-daybell-appeal"
    ],
    "free": [
      {
        "url": "/post/the-lori-vallow-daybell-case-remembering-jj-tylee-and-tammy-behind-the-doomsday-headlines/",
        "text": "Read the JJ, Tylee and Tammy Daybell case background"
      }
    ],
    "paid": []
  },
  {
    "key": "menendez",
    "entryIds": [
      "menendez-parole-watch"
    ],
    "free": [
      {
        "url": "/post/the-menendez-brothers-case-from-the-1989-murders-to-the-2025-resentencing-and-parole-fight/",
        "text": "The Menendez Brothers Case: From the 1989 Murders to the 2025 Resentencing and Parole Fight"
      }
    ],
    "paid": []
  },
  {
    "key": "combs",
    "entryIds": [
      "combs-appeal-watch"
    ],
    "free": [
      {
        "url": "/post/diddy-s-verdict-explained-what-sean-combs-was-convicted-of-and-what-the-jury-rejected/",
        "text": "Diddy's Verdict, Explained: What Sean Combs Was Convicted Of — and What the Jury Rejected"
      }
    ],
    "paid": []
  },
  {
    "key": "read",
    "entryIds": [
      "read-civil-watch"
    ],
    "free": [
      {
        "url": "/post/karen-read-was-acquitted-of-killing-john-o-keefe-his-family-is-still-waiting-for-answers/",
        "text": "Karen Read Was Acquitted of Killing John O'Keefe. His Family Is Still Waiting for Answers."
      }
    ],
    "paid": []
  },
  {
    "key": "heuermann",
    "entryIds": [
      "completed-4"
    ],
    "free": [
      {
        "url": "/post/rex-heuermann-sentencing-june-17-what-the-plea-established/",
        "text": "Rex Heuermann Sentenced in the Gilgo Beach Murders: What the Plea Established and What Comes Next"
      },
      {
        "url": "/post/the-gilgo-beach-murders-rex-heuermann-pleads-guilty-and-eight-women-are-finally-named/",
        "text": "The Gilgo Beach Murders: Inside the Long Island Serial Killer Case"
      },
      {
        "url": "/post/gilgo-beach-murders-science-unravels-nightmare/",
        "text": "The Gilgo Beach Murders: When Science Unravels a Decades-Long Nightmare"
      }
    ],
    "paid": []
  },
  {
    "key": "robinson",
    "entryIds": [
      "robinson-bindover-argument",
      "robinson-pretrial-conference"
    ],
    "free": [
      {
        "url": "/post/inconclusive-ballistics-explained/",
        "text": "What 'Inconclusive Ballistics' Actually Means in a Criminal Case"
      }
    ],
    "paid": []
  }
];
const HISTORICAL_ROUNDUPS = [
  {
    "url": "/post/this-week-in-court-august-30-2026/",
    "text": "This Week in Court: Aug. 30-Sept. 5 (background)",
    "keys": [
      "clancy",
      "tupac",
      "d4vd",
      "robinson"
    ],
    "ids": [
      "banks-federal-trial"
    ]
  },
  {
    "url": "/post/this-week-in-court-september-13-2026/",
    "text": "This Week in Court: Sept. 13-19 (background)",
    "keys": [],
    "ids": [
      "reiner-probate",
      "reiner-criminal-pretrial",
      "reiner-trust-access-oct23",
      "masud-lockerbie-status",
      "smith-pretrial-conference"
    ]
  },
  {
    "url": "/post/this-week-in-court-october-4-2026/",
    "text": "This Week in Court: Oct. 5-11 (background)",
    "keys": [],
    "ids": [
      "bhatt-jury-selection",
      "wiggins-triple-murder-trial",
      "reiner-probate",
      "reiner-criminal-pretrial",
      "reiner-trust-access-oct23",
      "kosowski-spencer-hearing"
    ]
  }
];
const WEEKLY_ROUNDUP_IDS = new Set(["farwell-trial-oct19","burke-prelim","sullivan-jury-trial","reiner-criminal-pretrial","reiner-trust-access-oct23","crum-spencer-hearing","robinson-pretrial-conference"]);
const WEEKLY_ROUNDUP = {"url":"/post/this-week-in-court-october-19-23-2026/","text":"This Week in Court: Oct. 19-23"};
const LIVE_PRODUCTS = {
  "austin-metcalf-karmelo-anthony-case-guide": {
    "url": "https://cassiancreed.beehiiv.com/products/austin-metcalf-karmelo-anthony-case-guide",
    "title": "The Killing of Austin Metcalf: A Plain-Language Guide to the Karmelo Anthony Case (v1)",
    "price": "$1.99"
  },
  "both-sides-michelle-parker-no-body-guide": {
    "url": "https://cassiancreed.beehiiv.com/products/both-sides-michelle-parker-no-body-guide",
    "title": "Both Sides of the Story: Michelle Parker — Can There Be a Murder Case With No Body?",
    "price": "$1.99"
  },
  "celeste-rivas-hernandez-d4vd-charges-guide": {
    "url": "https://cassiancreed.beehiiv.com/products/celeste-rivas-hernandez-d4vd-charges-guide",
    "title": "The Celeste Rivas Hernandez Case: A Plain-English Guide to the D4vd Charges",
    "price": "$1.99"
  },
  "brian-thompson-luigi-mangione-two-courts": {
    "url": "https://cassiancreed.beehiiv.com/products/brian-thompson-luigi-mangione-two-courts",
    "title": "The Brian Thompson Case: Luigi Mangione, Two Courts",
    "price": "$1.99"
  },
  "christa-pike-failed-execution-guide": {
    "url": "https://cassiancreed.beehiiv.com/products/christa-pike-failed-execution-guide",
    "title": "The Christa Pike Case After the Failed Execution: A Plain-English Guide (v1)",
    "price": "$1.99"
  },
  "case-chess-erin-patterson": {
    "url": "https://cassiancreed.beehiiv.com/products/case-chess-erin-patterson",
    "title": "Case Chess: The Erin Patterson Case",
    "price": "$2.99"
  },
  "lindsay-clancy-post-mistrial-field-guide": {
    "url": "https://cassiancreed.beehiiv.com/products/lindsay-clancy-post-mistrial-field-guide",
    "title": "Cora, Dawson and Callan: The Lindsay Clancy Post-Mistrial Field Guide",
    "price": "$1.99"
  },
  "jared-bridegan-case-guide-v2": {
    "url": "https://cassiancreed.beehiiv.com/products/jared-bridegan-case-guide-v2",
    "title": "Case Chess: The Jared Bridegan Case (v2) — One Verdict, One Trial Ahead",
    "price": "$1.99"
  },
  "eric-richins-kouri-evidence-verdict": {
    "url": "https://cassiancreed.beehiiv.com/products/eric-richins-kouri-evidence-verdict",
    "title": "Eric Richins: The Evidence-to-Verdict Guide",
    "price": "$1.99"
  },
  "michelle-parker-case-guide": {
    "url": "https://cassiancreed.beehiiv.com/products/michelle-parker-case-guide",
    "title": "The Michelle Parker Case Guide: A Murder Charge With No Body (v1)",
    "price": "$1.99"
  },
  "jury-chess": {
    "url": "https://cassiancreed.beehiiv.com/products/jury-chess",
    "title": "Jury Chess: How Criminal Jury Trials Actually Work",
    "price": "$5.99"
  },
  "tupac-shakur-keffe-d-case-guide": {
    "url": "https://cassiancreed.beehiiv.com/products/tupac-shakur-keffe-d-case-guide",
    "title": "Tupac Shakur and the Keffe D Case: The Complete Case Guide (v1)",
    "price": "$1.99"
  },
  "murdaugh-retrial-guide": {
    "url": "https://cassiancreed.beehiiv.com/products/murdaugh-retrial-guide",
    "title": "The Murdaugh Retrial Guide (v1): Maggie and Paul, the Overturned Verdict, and What Comes Next",
    "price": "$1.99"
  }
};
const PRODUCT_CAMPAIGNS = {
  "murdaugh-retrial-guide": "explainer_murdaugh_v1",
  "austin-metcalf-karmelo-anthony-case-guide": "explainer_anthony_v1",
  "jared-bridegan-case-guide-v2": "explainer_bridegan_v2",
  "tupac-shakur-keffe-d-case-guide": "explainer_tupac_v1"
};
const PUBLISHED_POSTS = new Set([
  "/post/a-jury-convicted-a-family-still-grieves-karmelo-anthony-verdict-austin-metcalf/",
  "/post/baby-boy-doe-mansfield-1985/",
  "/post/anatomy-of-a-murder-trial-hernandez-melgar/",
  "/post/cheryl-lynn-edwards-jane-clinton-doe-timeline/",
  "/post/can-you-be-convicted-of-murder-without-a-body/",
  "/post/cheryl-lynn-edwards-study-guide/",
  "/post/beyond-the-case-file-5-surprising-realities/",
  "/post/cheryl-lynn-edwards-jane-clinton-doe-faq/",
  "/post/christa-pike-failed-execution-what-happens-next/",
  "/post/eugene-gligor-leslie-preer/",
  "/post/chevy-chase-cold-case-dna/",
  "/post/does-criminal-profiling-actually-work/",
  "/post/etan-patz-supreme-court-2026-conviction-reinstated/",
  "/post/colt-gray-hearing-what-a-non-negotiated-plea-means/",
  "/post/diddy-s-verdict-explained-what-sean-combs-was-convicted-of-and-what-the-jury-rejected/",
  "/post/how-washington-courts-work-hernandez-melgar/",
  "/post/how-a-family-tree-catches-killers/",
  "/post/how-are-missing-people-found-the-science-of-the-search/",
  "/post/inconclusive-ballistics-explained/",
  "/post/how-investigators-search-for-a-victims-remains/",
  "/post/first-degree-second-degree-manslaughter-what-s-the-difference/",
  "/post/how-investigators-weigh-evidence-plain-english/",
  "/post/gilgo-beach-murders-science-unravels-nightmare/",
  "/post/karen-read-was-acquitted-of-killing-john-o-keefe-his-family-is-still-waiting-for-answers/",
  "/post/leslie-preer-murder/",
  "/post/jane-clinton-doe-identified-cheryl-lynn-edwards/",
  "/post/lindsay-clancy-trial-2026-postpartum-psychosis/",
  "/post/irasema-chavez-mayra-velasquez-arlington-cold-case/",
  "/post/lindsay-clancy-trial-postpartum-mental-health-legal-nexus/",
  "/post/jane-hart-benton-county-jane-doe-identified/",
  "/post/jane-hart-1976-case-file/",
  "/post/lindsay-clancy-trial/",
  "/post/maternal-instinct-netflix-forensic-evidence-taylor-parker/",
  "/post/nancy-guthrie-abduction-what-we-know/",
  "/post/meet-ai-al-the-forensic-method/",
  "/post/murder-staged-as-suicide-hernandez-melgar/",
  "/post/mexico-surfer-trial-opening-days/",
  "/post/luigi-mangione-psychiatric-defense-withdrawn-trial-2026/",
  "/post/michelle-parker-case-dale-smith-charged-no-body/",
  "/post/nestor-hernandez-melgar-sentencing/",
  "/post/ngri-massachusetts-explainer/",
  "/post/nancy-guthrie-case-update-verified-timeline/",
  "/post/nestor-hernandez-melgar-lindsay-geary-case/",
  "/post/nancy-guthrie-arizona-federal-kidnapping-jurisdiction/",
  "/post/nancy-guthrie-ransom-notes-what-they-reveal/",
  "/post/othram-genetic-genealogy-leslie-preer-cold-case/",
  "/post/sara-gilson-jeremiah-duffey-owasso-case-file/",
  "/post/rachel-morin-case-timeline/",
  "/post/reading-the-crime-scene-what-forensics-reveals/",
  "/post/rex-heuermann-sentencing-june-17-what-the-plea-established/",
  "/post/stalking-documentation-digital-safety-finding-help/",
  "/post/the-frame-the-banfield-au-pair-affair-the-full-account/",
  "/post/the-gabby-petito-case-timeline-investigation-and-lasting-impact/",
  "/post/the-gilgo-beach-murders-rex-heuermann-pleads-guilty-and-eight-women-are-finally-named/",
  "/post/the-delphi-murders-how-libby-german-s-own-phone-helped-convict-richard-allen/",
  "/post/the-casey-goodson-jr-case-ex-deputy-jason-meade-reckless-homicide-conviction-explained/",
  "/post/the-frame-christine-banfield-joseph-ryan-fairfax-au-pair-murders/",
  "/post/the-btk-killer-how-dennis-rader-was-finally-caught/",
  "/post/the-golden-state-killer-how-genetic-genealogy-caught-joseph-deangelo/",
  "/post/the-menendez-brothers-case-from-the-1989-murders-to-the-2025-resentencing-and-parole-fight/",
  "/post/the-murdaugh-murders-how-alex-murdaugh-was-convicted-and-why-he-now-faces-a-new-trial/",
  "/post/the-lindsay-clancy-case-three-children-one-trial-and-the-questions-massachusetts-must-answer/",
  "/post/the-maya-millete-case-larry-milletes-no-body-murder-trial-explained/",
  "/post/the-laci-peterson-case-what-happened-and-where-scott-peterson-s-case-stands-now/",
  "/post/kouri-richins-eric-richins-murder/",
  "/post/the-murder-of-rachel-morin-how-her-killer-was-found/",
  "/post/the-lori-vallow-daybell-case-remembering-jj-tylee-and-tammy-behind-the-doomsday-headlines/",
  "/post/the-trail-the-murder-of-rachel-morin-the-full-account/",
  "/post/this-week-in-court-september-13-2026/",
  "/post/the-murder-of-rachel-nickell-how-dna-caught-robert-napper-and-cleared-colin-stagg/",
  "/post/the-taylor-parker-case-the-murder-of-reagan-simmons-hancock-and-where-it-stands-now/",
  "/post/this-week-in-court-october-4-2026/",
  "/post/this-week-in-court-october-19-23-2026/",
  "/post/this-week-in-court-august-30-2026/",
  "/post/warning-signs-the-science-validates-a-safety-system/",
  "/post/two-names-that-come-first-dominic-russo-and-davion-flanagan/",
  "/post/what-happens-at-d4vds-monday-hearing/",
  "/post/what-a-racial-justice-act-violation-means-dominguez/",
  "/post/what-actually-happens-on-day-one-of-a-high-profile-trial/",
  "/post/what-happened-in-the-idaho-student-murders-the-bryan-kohberger-case-explained/",
  "/post/what-actually-happens-when-a-jury-deliberates/",
  "/post/why-was-keffe-d-convicted-tupac-shakur/",
  "/post/why-do-innocent-people-confess-to-crimes-they-didn-t-commit/",
  "/post/what-is-coercive-control-the-signs-examples-and-what-to-do/",
  "/post/why-do-some-murders-go-unsolved-linkage-blindness/",
  "/post/whose-consent-travels-across-borders/"
]);
// Reviewed event matches, not case names or stale IDs. No book is inferred
// from a hearing's notes, a grand jury, or an appellate reference to a verdict.
export const JURY_CHESS_ENTRY_IDS = new Set(["clancy-trial","faith-hedgepeth-trial","michael-vaughan-trial","murdaugh-retrial","salazar-clinkunbroomer-trial","gardner-jury-selection","gardner-trial","bridegan-fernandez-trial","goncalves-wsu-trial","bhatt-jury-selection","farwell-jury-trial","farwell-trial-oct19","moore-sherman-trial","carter-brooks-trial","wagner-trial","killins-verdict-sentencing","crum-odom-verdict","elmore-laura-miller-trial","banks-federal-trial","aramburu-paris-trial","bohm-trial","eaton-burlington-trial","brianna-moore-trial","kepner-federal-trial","mary-collins-trial","martin-risner-sentencing","conway-mo3-trial","virzi-trial","ryan-cavett-trial","preston-lord-meisner-trial","preston-lord-five-defendant-trial"]);
export const JURY_CHESS_LINK = {
  url: 'https://cassiancreed.com/books/',
  text: 'Get Jury Chess',
  bookKey: 'jury-chess',
  placement: 'court_calendar_jury_chess',
  type: 'book',
  badge: 'BOOK',
  paid: false,
};
export const CALENDAR_LINK_TYPES = ['free', 'paid', 'book'];
export function classifyCalendarLink(link) {
  const path = pathKey(link.url);
  const product = Object.values(LIVE_PRODUCTS).find((item) => pathKey(item.url) === path);
  const type = link.type || (path === '/books' || link.bookKey === 'jury-chess' || /\/products\/(jury-chess|two-stories-one-verdict)$/.test(path) ? 'book'
    : /^https:\/\/cassiancreed\.beehiiv\.com\/products\//.test(link.url) ? 'paid' : 'free');
  const price = product?.price || link.price;
  return { ...link, type, price, paid: type === 'paid', badge: type === 'free' ? 'FREE' : type === 'book' ? 'BOOK' : price ? price + ' GUIDE' : 'GUIDE' };
}
export function calendarLinkTypesFor(entries) {
  return CALENDAR_LINK_TYPES.filter((type) => entries.some((entry) => (entry.explainerLinks || calendarLinksFor(entry)).some((link) => link.type === type)));
}
const byEntry = new Map(CALENDAR_EXPLAINER_CASES.flatMap((item) => item.entryIds.map((id) => [id, item])));
const pathKey = (url) => url.replace(/^https:\/\/cassiancreed\.com/, '').split('?')[0].replace(/\/$/, '');
const eligibleFree = (url) => !url.startsWith('/post/') || PUBLISHED_POSTS.has(url.split('?')[0]);

export function calendarLinksFor(entry) {
  const matched = byEntry.get(entry.id);
  const free = [];
  const paid = [];
  const seen = new Set();
  const addFree = (url, text) => {
    if (!url || !eligibleFree(url) || seen.has(pathKey(url))) return;
    seen.add(pathKey(url));
    free.push({ url, text, paid: false });
  };
  addFree(entry.link, entry.linkText || 'Read the case');
  addFree(entry.link2, entry.linkText2 || 'Read the case');
  for (const link of matched?.free || []) addFree(link.url, link.text);
  for (const link of HISTORICAL_ROUNDUPS) {
    if (link.keys.includes(matched?.key) || link.ids.includes(entry.id)) addFree(link.url, link.text);
  }
  const date = entry.dateISO || '';
  if (WEEKLY_ROUNDUP_IDS.has(entry.id) && date >= '2026-10-19' && date <= '2026-10-23') {
    addFree(WEEKLY_ROUNDUP.url, WEEKLY_ROUNDUP.text);
  }
  const addPaid = (guide) => {
    if (!guide || seen.has(pathKey(guide.url))) return;
    const product = Object.values(LIVE_PRODUCTS).find((item) => pathKey(item.url) === pathKey(guide.url));
    if (!product) return;
    seen.add(pathKey(guide.url));
    paid.push({ ...guide, paid: true });
  };
  for (const guide of [EXISTING_CASE_GUIDES[entry.id]].flat().filter(Boolean)) addPaid(guide);
  for (const key of matched?.paid || []) {
    const product = LIVE_PRODUCTS[key];
    if (!product) continue;
    addPaid({
      url: product.url + '?utm_source=cassiancreed.com&utm_medium=court_calendar&utm_campaign=' + (PRODUCT_CAMPAIGNS[key] || ('explainer_' + matched.key + '_v1')) + '&utm_content=' + entry.id.replace(/-/g, '_') + '_entry',
      text: product.title + ' — ' + product.price,
      bookKey: key,
      placement: 'court_calendar_' + entry.id.replace(/-/g, '_') + '_entry',
    });
  }
  const links = [...free, ...paid].map(classifyCalendarLink);
  if (JURY_CHESS_ENTRY_IDS.has(entry.id) && !links.some((link) => link.type === 'book')) links.push({ ...JURY_CHESS_LINK });
  // The existing Jury Chess promo retains its approved wording; its BOOK link
  // now goes to the same Books page as the other trial entries.
  return links.map((link) => link.bookKey === 'jury-chess' ? { ...link, ...JURY_CHESS_LINK, text: link.text } : link)
    .sort((a, b) => CALENDAR_LINK_TYPES.indexOf(a.type) - CALENDAR_LINK_TYPES.indexOf(b.type));
}
