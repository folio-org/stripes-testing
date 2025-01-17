import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewExpenseClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const firstexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const secondexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const thirdexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const forthexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const fifthexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const sixthexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const seventhexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const eighthexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const ninethexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const tenthexpenseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const expenseClassIds = [];
    const mappingProfile = {
      name: `C365106 Expense classes testing_${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      fundDistributionSource: 'Use fund distribution field mappings',
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        cy.wrap([
          firstexpenseClassData,
          secondexpenseClassData,
          thirdexpenseClassData,
          forthexpenseClassData,
          fifthexpenseClassData,
          sixthexpenseClassData,
          seventhexpenseClassData,
          eighthexpenseClassData,
          ninethexpenseClassData,
          tenthexpenseClassData,
        ]).each((expenseClass) => {
          NewExpenseClass.createViaApi(expenseClass).then((response) => expenseClassIds.push(response));
        });
      });
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        expenseClassIds.forEach((id) => {
          SettingsFinance.deleteViaApi(id);
        });
      });
    });

    it(
      'C365106 Verify the number of expense classes for fund distribution field mappings in field mapping profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C365106'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addExpenseClass(mappingProfile.fundDistributionSource);
        cy.wrap([
          firstexpenseClassData.name,
          secondexpenseClassData.name,
          thirdexpenseClassData.name,
          forthexpenseClassData.name,
          fifthexpenseClassData.name,
          sixthexpenseClassData.name,
          seventhexpenseClassData.name,
          eighthexpenseClassData.name,
          ninethexpenseClassData.name,
          tenthexpenseClassData.name,
        ]).each((expenseClassName) => {
          NewFieldMappingProfile.verifyExpenseClassesIsPresentedInDropdown(expenseClassName);
        });
      },
    );
  });
});
