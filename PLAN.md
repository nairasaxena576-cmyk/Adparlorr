# Adparlorr Improvement Plan

## PRIORITY 1 — TRAINING COMPLETION SOURCE OF TRUTH
**Files to change:**
1. `backend/src/services/trainingAssessment.service.ts` - Remove call to `evaluateAndSetTrainingCompletion()`
2. `backend/src/services/training.service.ts` - Comment out or deprecate `evaluateAndSetTrainingCompletion()` (preserve for backward compatibility)
3. Add comment explaining that only the training task system writes to trainingCompletedAt

**Why:** 
- Currently both legacy course system and new task system write to trainingCompletedAt
- New product-image task system is intended to be authoritative
- Legacy system should only update its own progress tables, not the user's trainingCompletedAt

**Schema changes:** None required
**Data impact:** None - legacy system still works for its own progress tracking

## PRIORITY 2 — DEMO CREDITS
**Files to change:**
1. `backend/src/services/order.service.ts` - Improve `resolveDemoShortfall()` function

**Why:**
- Currently just sets workbenchBalance to 0, losing the opportunity to earn back negative amount
- Should add simulated credits to resolve shortfall while making it clear it's simulation-only

**Implementation:**
- Calculate shortfall amount (negative workbenchBalance)
- Add that amount as simulated credits to workbenchBalance
- Keep all other behavior the same (no real Wallet impact, no deposits/transactions)

**Schema changes:** None required
**Data impact:** None - pure simulation logic change

## PRIORITY 3 — EXACT 45-SLOT WORKBENCH
**Files to change:**
1. `backend/src/services/order.service.ts` - `loadWorkbenchSet()` and `getWorkbenchState()`

**Why:**
- Current logic: `ready = eligible.length >= setSize` then uses first 45
- Should ensure completion only when exactly 45 products submitted from the first 45 eligible

**Implementation:**
- Keep first 45 eligible products as the workbench set
- Status shows X/45 where X = completed from this set
- Only COMPLETE when X = 45
- NOT_READY when eligible < 45
- Show workbench readiness as X/45 in admin

**Schema changes:** None required
**Data impact:** None

## PRIORITY 4 — MERGED PRODUCT UI
**Files to change:**
1. `src/pages/Orders.tsx` - MergeCard component
2. `src/types.ts` - Ensure proper typing for merged product data

**Why:**
- Current UI only shows first product in merge bundle
- Need to show all 1-3 bundled products

**Implementation:**
- Modify MergeCard to map over all bundle.products
- Show product name, image, price for each
- Display combined value and merged commission clearly

**Schema changes:** None required
**Data impact:** None

## PRIORITY 5 — PRODUCT ADMIN READINESS
**Files to change:**
1. `src/pages/admin/ProductManagement.tsx` - ProductListView component
2. `backend/src/services/order.service.ts` - Ensure eligibility logic consistent

**Why:**
- Need clear visual indication of product pricing and eligibility status
- Admin should see Workbench readiness: X/45

**Implementation:**
- Add Priced/Not priced badges based on price > 0
- Add Eligible/Not eligible based on isActive && price > 0
- Show Workbench readiness: X/45 at top (X = count of eligible products)
- Add READY/NOT READY status indicator

**Schema changes:** None required
**Data impact:** None

## PRIORITY 6 — RECORDS
**Files to change:**
1. `src/pages/Records.tsx` - Records display component
2. `src/types.ts` - Ensure proper typing for submission data

**Why:**
- Need to distinguish NORMAL vs MERGED submissions
- For merged, show all bundled products rather than only first one

**Implementation:**
- Use existing `isMergedOrder` field on TaskSubmission
- For merged submissions, fetch and display all products in the merge bundle
- Need to enhance order service to return bundle info for historical merged submissions
- Or store merge bundle info in TaskSubmission (may require schema change)

**Analysis:** Looking at TaskSubmission model, it has `isMergedOrder` but doesn't store which products were bundled.
Options:
A) Add mergeBundleProducts JSON field to TaskSubmission (requires migration)
B) Reconstruct from context when displaying (complex, may not be accurate historically)
C) For now, show that it was merged and note that details available in admin (simpler)

Given the constraint "Do not create a new table unless genuinely necessary" and "Do not modify existing migrations", I'll go with option C for now - improve display to show merged status clearly, and note that bundle details are available in admin view.

If bundle reconstruction is deemed essential, we may need to consider a migration, but let's start with clearer labeling.

**Schema changes:** Potentially none (if we go with clearer labeling without storing bundle data)
**Data impact:** None

## PRIORITY 7-9 — SECURITY, SEPARATION, TESTS
**Files to change:**
1. Add/update tests in `backend/tests/` directory

**Why:**
- Verify trainingCompletedAt has one clear writer
- Verify workbench remains exactly 45 slots
- Verify commission calculations
- Verify demo resolution isolation
- Verify real Wallet separation

**Implementation:**
- Create/update test files for orders, training, wallet services
- Focus on the specific scenarios listed in requirements

**Schema changes:** None required
**Data impact:** None