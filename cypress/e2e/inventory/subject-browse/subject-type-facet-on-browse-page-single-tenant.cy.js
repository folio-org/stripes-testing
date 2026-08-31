import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import SubjectTypes, {
  FOLIO_SUBJECT_TYPES,
} from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const accordionName = 'Subject type';
    const localTypeCount = 1;
    const localTypeNames = Array.from(
      { length: localTypeCount },
      (_, i) => `AT_C569606_Type_${i}_${randomPostfix}`,
    );
    const subjectValues = Array.from(
      { length: localTypeCount + FOLIO_SUBJECT_TYPES.length },
      (_, i) => `AT_C569606_Subject_${i}_${randomPostfix}`,
    );
    const testData = {
      user: {},
      localTypeIds: [],
      folioTypeIds: [],
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      SubjectTypes.getSubjectTypesViaApi({ limit: 50, query: 'source=folio' }).then(
        (subjectTypes) => {
          testData.folioTypeIds = subjectTypes
            .filter((type) => FOLIO_SUBJECT_TYPES.includes(type.name))
            .map((type) => type.id);
        },
      );
      cy.getInstanceTypes({ limit: 1 }).then(([instanceType]) => {
        for (let i = 0; i < localTypeCount; i++) {
          SubjectTypes.createViaApi({
            source: 'local',
            name: localTypeNames[i],
          }).then((response) => {
            testData.localTypeIds.push(response.body.id);
          });
        }
        cy.then(() => {
          const subjectsData = [...testData.localTypeIds, ...testData.folioTypeIds].map(
            (typeId, i) => ({
              value: subjectValues[i],
              typeId,
            }),
          );
          cy.createInstance({
            instance: {
              instanceTypeId: instanceType.id,
              title: `AT_C569606_FolioInstance_${randomPostfix}`,
              subjects: subjectsData,
            },
          });
        });
      });
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceByTitleViaApi('C569606_');
        Users.deleteViaApi(testData.user.userId);
        testData.localTypeIds.forEach((id) => SubjectTypes.deleteViaApi(id));
      });
    });

    it(
      'C569606 Check "Subject type" facet on "Browse" page (promin)',
      { tags: ['extendedPath', 'promin', 'C569606'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.select();
        subjectValues.forEach((subjectValue) => {
          BrowseSubjects.waitForSubjectToAppear(subjectValue);
        });

        // Step 1: Run browse with any search query; verify browse result list displayed
        BrowseSubjects.browse(subjectValues[0]);

        // Step 2: Expand "Subject type" accordion; verify accordion expanded and dropdown active
        BrowseSubjects.verifyAccordionStatusByName(accordionName, false);
        BrowseSubjects.expandAccordion(accordionName);
        BrowseSubjects.verifyAccordionStatusByName(accordionName, true);

        // Step 3: Click Subject type dropdown; verify all FOLIO and local types (17+) are displayed
        BrowseSubjects.verifySubjectTypeDropdownOptions([
          ...FOLIO_SUBJECT_TYPES,
          ...localTypeNames,
        ]);
      },
    );
  });
});
