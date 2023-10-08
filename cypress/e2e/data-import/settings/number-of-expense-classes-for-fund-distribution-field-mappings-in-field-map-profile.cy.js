import getRandomPostfix from '../../../support/utils/stringTools';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewExpenseClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';

describe('data-import', () => {
  describe('Settings', () => {
    const firstExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const secondExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const thirdExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const forthExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const fifthExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const sixthExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const seventhExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const eighthExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const ninethExpencseClassData = {
      name: `autotestExpenseClass_${getRandomPostfix()}`,
      code: `autotestExpenseClassCode_${getRandomPostfix()}`,
    };
    const tenthExpencseClassData = {
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

    before('create test data', () => {
      cy.getAdminToken().then(() => {
        cy.wrap([
          firstExpencseClassData,
          secondExpencseClassData,
          thirdExpencseClassData,
          forthExpencseClassData,
          fifthExpencseClassData,
          sixthExpencseClassData,
          seventhExpencseClassData,
          eighthExpencseClassData,
          ninethExpencseClassData,
          tenthExpencseClassData,
        ]).each((expenseClass) => {
          NewExpenseClass.createViaApi(expenseClass).then((response) => expenseClassIds.push(response));
        });
      });
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('delete test data', () => {
      expenseClassIds.forEach((id) => {
        SettingsFinance.deleteViaApi(id);
      });
    });

    it(
      'C365106 Verify the number of expense classes for fund distribution field mappings in field mapping profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addExpenceClass(mappingProfile.fundDistributionSource);
        cy.wrap([
          firstExpencseClassData.name,
          secondExpencseClassData.name,
          thirdExpencseClassData.name,
          forthExpencseClassData.name,
          fifthExpencseClassData.name,
          sixthExpencseClassData.name,
          seventhExpencseClassData.name,
          eighthExpencseClassData.name,
          ninethExpencseClassData.name,
          tenthExpencseClassData.name,
        ]).each((expenseClassName) => {
          NewFieldMappingProfile.verifyExpenseClassesIsPresentedInDropdown(expenseClassName);
        });
      },
    );
  });
});
