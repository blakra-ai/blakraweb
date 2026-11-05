# Portfolio inventory (crawled 2026-11-02)

Source text kept verbatim for reference; numbers, studio name and "concept study" framing are NOT carried to blakra.us.

## Vitrin (`vitrin-app`)
- Category: MOBILE STOREFRONT AND INVENTORY APP
- Subtitle: A mobile storefront and a stockroom app for the same clothing shop.
- Description: Designed for independent clothing shops that sell in store and online. The concept keeps the customer catalogue and the staff stock count in one system, so a size shown as available is a size that exists.
- Platforms: iOS and Android
- Problem: A shop that sells in two places usually records sales in one tool and stock in another. Size availability lags behind the shop floor, and a delivery is counted on paper before anyone types it in.
- Design:
  1. Product screens read availability from the record the staff app writes, so the two views cannot disagree.
  2. The stockroom screen opens on a scan field; a barcode returns the item, the size and the current count.
  3. Low-stock items are listed above full inventory and ordered by how quickly they sell.
  4. Stock receipts are entered per size rather than as one total, which keeps the count usable after the delivery.
  5. Staff controls sit in a separate mode, so a customer holding the phone cannot open them.
- Images (raw/vitrin-app/):
  - 01-phone.png (phone, 640x1356): Storefront screen: hero image, category filters and a two-column product grid.
  - 02-phone.png (phone, 640x1356): Product screen: photograph, price, size selection and stock state.
  - 03-phone.png (phone, 640x1356): Stockroom screen: shift totals, low-stock list and a scan field.
  - 00-hero.png (composite hero, reference only)

## Veyra (`veyra-money`)
- Category: CONSUMER MONEY APP
- Subtitle: A money app built around what can be spent now.
- Description: Designed for people who want a clearer account of day-to-day spending than a bank app gives them. It puts the balance, the change over the month and the activity that produced it on one screen.
- Platforms: iOS and Android
- Problem: Bank apps list transactions but rarely say what they add up to. A balance that still includes bills due looks available when it is not, and the gap is only noticed after a payment fails.
- Design:
  1. The home screen states the balance first, then the change over the month, then the activity behind both.
  2. Spending is grouped by merchant category and set against the previous month.
  3. The transfer screen keeps recipient, amount and fee visible at once, with a keypad sized for one hand.
  4. Card controls sit below the card itself rather than in a settings area.
  5. A dark field with a single accent colour keeps amounts legible at small sizes.
- Images (raw/veyra-money/):
  - 01-phone.png (phone, 640x1356): Wallet screen: balance, card and recent activity.
  - 02-phone.png (phone, 640x1356): Transfer screen: recipient, amount and keypad.
  - 03-phone.png (phone, 640x1356): Insights screen: monthly spend and category breakdown.
  - 00-hero.png (composite hero, reference only)

## Vitrin Console (`vitrin-console`)
- Category: STORE OPERATIONS DASHBOARD
- Subtitle: A back office for a shop that runs across several locations.
- Description: Designed for store managers who need the morning picture before the first customer. It shows what sold, what is running low and which orders need a decision.
- Platforms: Desktop web
- Problem: Managers of several locations usually assemble that picture from exports and messages. The same figure arrives in a different format from each place, and the version on screen is rarely the current one.
- Design:
  1. Four figures sit at the top — revenue, orders, conversion and average order value — each with the period it is compared to.
  2. Revenue is drawn over seven days, and the table below stays filtered to the same range.
  3. Orders can be filtered by store and status, with the count of matches stated above the list.
  4. Loading and empty states are designed, because a quiet morning is a normal state for a dashboard.
  5. Table text is set at a readable size first; density is added around the type rather than into it.
- Images (raw/vitrin-console/):
  - 01-browser.png (browser, 2000x1363): Overview screen: revenue figures, seven-day chart and top products.
  - 02-browser.png (browser, 2000x1363): Orders screen: store and status filters, order table and status column.
  - 00-hero.png (composite hero, reference only)

## Flowline (`flowline-automation`)
- Category: WORKFLOW AUTOMATION TOOL
- Subtitle: A canvas for approvals and hand-offs that would otherwise run through email.
- Description: Designed for operations teams whose approval chains pass through a shared mailbox. It gives each request a visible state and a named owner.
- Platforms: Desktop web
- Problem: An approval that lives in email loses its state. Nobody can say which request is waiting on whom without reading a thread, and a request that stalls leaves no trace of where it stopped.
- Design:
  1. Steps are placed on a canvas in the order they run, with a connector between each.
  2. A condition step states its field, operator and value in a properties panel beside the canvas.
  3. Approval steps name the person or role responsible, so a waiting request has an owner.
  4. Run history records each step with a timestamp and a result.
  5. A failed run is retried from the step that failed, not from the start.
- Images (raw/flowline-automation/):
  - 01-browser.png (browser, 2000x1363): Builder screen: four steps, one condition and the properties panel.
  - 02-browser.png (browser, 2000x1363): Runs screen: volume chart, result table and per-step history.
  - 00-hero.png (composite hero, reference only)

## Helya (`helya-ai`)
- Category: INTERNAL KNOWLEDGE ASSISTANT
- Subtitle: An assistant that answers from an organisation’s own documents and shows where the answer came from.
- Description: Designed for teams whose procedures live in long documents. It answers in prose and cites the document and page behind each part of the answer.
- Platforms: Desktop web
- Problem: Policies and maintenance notes are written for completeness, then stored in shared drives. Finding the current clause takes longer than the task it describes, so people ask a colleague instead.
- Design:
  1. Answers cite the document and page beside each claim, and the source passage is shown in a side panel.
  2. Document access follows the reader’s permissions rather than the index, so a restricted file stays restricted.
  3. Unanswered questions are collected as gaps, which is the only reliable signal of what the index is missing.
  4. The answer column stays narrow, because the content is prose rather than tables.
  5. The composer holds its position at the bottom instead of moving between turns.
- Images (raw/helya-ai/):
  - 01-browser.png (browser, 2000x1363): Answer screen: prose answer, numbered source references and the source passage beside it.
  - 00-hero.png (composite hero, reference only)

## Nuvoq (`nuvoq-vision`)
- Category: INSPECTION DASHBOARD FOR A PRODUCTION LINE
- Subtitle: A quality-control screen for a line that moves faster than a person can look.
- Description: Designed for line operators and shift supervisors. It shows four camera feeds, the current defect call and the record for the batch.
- Platforms: Desktop web and shop-floor screens
- Problem: Manual inspection at line speed is inconsistent, and the only record of it is a paper sheet. A missed defect is then found by the customer, after the batch has been packed and shipped.
- Design:
  1. Four camera feeds are shown together, each labelled with its camera number and frame rate.
  2. A detection box stays attached to the frame it belongs to and names the defect class and the confidence.
  3. The summary row states inspected count, pass rate and defects for the current shift.
  4. A batch report keeps the annotated image next to each recorded defect, so a call can be reviewed later.
  5. States use shape as well as colour, because the screen is read in low light and at a glance.
- Images (raw/nuvoq-vision/):
  - 01-browser.png (browser, 2000x1363): Live screen: four camera feeds with detection boxes and a shift summary.
  - 02-browser.png (browser, 2000x1363): Report screen: defect list with annotated evidence.
  - 00-hero.png (composite hero, reference only)

## Tiravan (`tiravan-logistics`)
- Category: DELIVERY DISPATCH AND DRIVER APP
- Subtitle: A dispatch screen and a driver app that share one view of the day.
- Description: Designed for freight operators who currently coordinate drivers by phone. The dispatch screen shows route progress; the driver app shows the next stop and keeps it when the signal goes.
- Platforms: Desktop web, iOS and Android
- Problem: A dispatcher who cannot see stop progress calls the driver to ask. A driver who loses signal loses the stop list with it, and proof of delivery becomes a later phone call.
- Design:
  1. The map marks completed and remaining stops differently on each route.
  2. The route list states stops done against stops assigned, per driver.
  3. The driver app keeps the stop list on the device, so a lost connection does not lose the day.
  4. Proof of delivery is captured as a photo with a timestamp at the stop.
  5. Arrival times are estimated from completed stops rather than from a fixed average.
- Images (raw/tiravan-logistics/):
  - 01-browser.png (browser, 2000x1363): Dispatch screen: routes on a map with completed and remaining stops.
  - 02-phone.png (phone, 640x1356): Driver screen: next stop, arrival estimate and proof-of-delivery step.
  - 00-hero.png (composite hero, reference only)

## Raah (`raah-learning`)
- Category: ASSESSMENT AND LEARNING ANALYTICS
- Subtitle: An exam app for students and a results view for teachers.
- Description: Designed for schools that run mock exams on paper. The test app records answers as they are chosen; the results view turns them into topics a teacher can act on that week.
- Platforms: Desktop web, iOS and Android
- Problem: A paper exam becomes data only after someone types it in. By the time a teacher sees which topic failed, the class has moved on, and the same mistake appears in the next test.
- Design:
  1. The exam screen keeps timer, question number and progress in one bar.
  2. Answers save as they are selected, and the screen states when the last save happened.
  3. The results view compares topics rather than ranking students against each other.
  4. Weak topics are listed with the questions that produced them, so the teacher can reread the question.
  5. Question text is set larger than the labels around it, because it is read under time pressure.
- Images (raw/raah-learning/):
  - 01-browser.png (browser, 2000x1363): Results screen: topic comparison, term trend and recent assessments.
  - 02-phone.png (phone, 640x1356): Exam screen: timer, progress, four options and a saved state.
  - 00-hero.png (composite hero, reference only)

## Not imported yet: kavira-platform, paperlight-game, driftlight-game
The source preview went down mid-crawl (HTTP 503, "Preview is starting up") and stayed down through ~20 minutes of retries. Only the home-page teasers were captured (raw/home.txt):
- Kavira — API console and documentation: "A console and a reference for developers integrating with an API."
- Paperlight — mobile puzzle game: "A puzzle platformer built around one carried object: a light."
- Driftlight — night racing game: "An arcade racer built around drift handling and a dark track."
To finish: `node crawl.mjs kavira-platform paperlight-game driftlight-game`, `python3 -I parse.py`, `node images.mjs`, `python3 -I gen-work.py`, then add copy in 4 locales.
