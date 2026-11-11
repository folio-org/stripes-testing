import { ADJUSTMENT_PRORATE, FOLIO_RECORD_TYPE } from '../../../support/constants';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import ExpenseClasses from '../../../support/fragments/settings/finance/expenseClasses';
import NewExpenseClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    const namePrefix = 'AT_C365107_';
    const getExpenseClassName = (word) => `${namePrefix}${word}_${randomPostfix}`;
    // Alphabetical order, ignoring case: upper-case and lower-case words are one consolidated
    // list. A case-sensitive (ASCII) sort would put every upper-case word before "alpha"
    const wordsInExpectedOrder = [
      'alpha',
      'Bravo',
      'charlie',
      'Delta',
      'echo',
      'Foxtrot',
      'golf',
      'Hotel',
      'india',
      'Juliet',
      'kilo',
      'Lima',
    ];
    // More than 10 expense classes, created NOT in alphabetical order
    const wordsInCreationOrder = [
      'kilo',
      'Bravo',
      'india',
      'Delta',
      'golf',
      'alpha',
      'Lima',
      'echo',
      'Juliet',
      'charlie',
      'Hotel',
      'Foxtrot',
    ];
    const expectedExpenseClassNames = wordsInExpectedOrder.map(getExpenseClassName);
    const expenseClassIds = [];
    const mappingProfile = { name: `AT_C365107_MappingProfile_${randomPostfix}` };

    before('Create test data and login', () => {
      cy.getAdminToken();
      // Leftovers of earlier runs (different random postfix)
      ExpenseClasses.getExpenseClassesViaApi({ query: `name="${namePrefix}*"` }).then(
        (expenseClasses) => {
          expenseClasses.forEach(({ id }) => ExpenseClasses.deleteExpenseClassViaApi(id));
        },
      );

      cy.then(() => {
        wordsInCreationOrder.forEach((word) => {
          NewExpenseClass.createViaApi({
            name: getExpenseClassName(word),
            code: `AT_C365107_code_${word}_${randomPostfix}`,
          }).then((expenseClassId) => expenseClassIds.push(expenseClassId));
        });
      });

      cy.setDefaultLocaleApi();

      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      expenseClassIds.forEach((id) => ExpenseClasses.deleteExpenseClassViaApi(id));
    });

    it(
      'C365107 Verify the number of expense classes for Invoice adjustment in field mapping profile (promin)',
      { tags: ['extendedPath', 'promin', 'C365107'] },
      () => {
        // Step 1: Settings > Data import > Field mapping profiles > Actions > New field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.waitLoading();

        // Step 2: Name, Incoming record type = EDIFACT invoice, FOLIO record type = Invoice
        NewFieldMappingProfile.addName(mappingProfile.name);
        NewFieldMappingProfile.addIncomingRecordType(
          NewFieldMappingProfile.incomingRecordType.edifact,
        );
        NewFieldMappingProfile.addFolioRecordType(FOLIO_RECORD_TYPE.INVOICE);

        // Steps 3-4: "Invoice adjustments" accordion is expanded by default; add an adjustment
        // and set Pro rate = "Not prorated" - "Add fund distribution" becomes active
        NewFieldMappingProfile.addInvoiceLevelAdjustment();
        NewFieldMappingProfile.openProRateAcceptedValues();
        NewFieldMappingProfile.selectAdjustmentAcceptedValue(ADJUSTMENT_PRORATE.NOT_PRORATED);
        NewFieldMappingProfile.verifyProRateFieldValue(ADJUSTMENT_PRORATE.NOT_PRORATED);

        // Step 5: Add fund distribution, open the "Expense Class" accepted values
        NewFieldMappingProfile.clickAddAdjustmentFundDistribution();
        NewFieldMappingProfile.openAdjustmentExpenseClassAcceptedValues();
        // All own expense classes (more than 10) are listed
        expectedExpenseClassNames.forEach((expenseClassName) => {
          NewFieldMappingProfile.verifyExpenseClassesIsPresentedInDropdown(expenseClassName);
        });
        // ... in alphabetical order with one consolidated list for upper- and lower-case names
        NewFieldMappingProfile.getAcceptedValuesDropdownItems().then((items) => {
          const ownItems = items.filter((item) => item.startsWith(namePrefix));

          expect(ownItems).to.deep.equal(expectedExpenseClassNames);
        });
      },
    );
  });
});
