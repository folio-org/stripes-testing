import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomNDigitNumber(10);
    const authorityHeading = `AT_C375224_MarcAuthority_${randomPostfix}`;
    const instanceTitlePrefix = `AT_C375224_MarcBibInstance_${randomPostfix}`;
    const precedingSubjectPrefix = 'aaa_C375224_preceding';

    const testData = {
      user: {},
      instanceId1: null,
      instanceId2: null,
      authorityId1: null,
      authorityId2: null,
    };

    const tags = {
      tag008: '008',
      tag245: '245',
      tag600: '600',
      tag650: '650',
      tag150: '150',
    };

    const authorityFields = [
      { tag: tags.tag150, content: `$a ${authorityHeading}`, indicators: ['\\', '\\'] },
    ];

    const marcBibFields = (title) => [
      { tag: tags.tag008, content: QuickMarcEditor.defaultValid008Values },
      { tag: tags.tag245, content: `$a ${title}`, indicators: ['1', '1'] },
      { tag: tags.tag650, content: '$a Field650', indicators: ['\\', '0'] },
    ];

    // to make sure our target subject value is 6th in the browse result list
    const precedingSubjectValues = Array.from(
      { length: 5 },
      (_, i) => `${precedingSubjectPrefix}${i + 1}`,
    );
    const precedingSubjectFields = precedingSubjectValues.map((value) => ({
      tag: tags.tag650,
      content: `$a ${value}`,
      indicators: ['\\', '0'],
    }));

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375224_');
      InventoryInstances.deleteInstanceByTitleViaApi('C375224_');

      cy.then(() => {
        MarcAuthorities.createMarcAuthorityViaAPI(
          '',
          `375224${randomDigits}1`,
          authorityFields,
        ).then((id) => {
          testData.authorityId1 = id;
        });
        MarcAuthorities.createMarcAuthorityViaAPI(
          '',
          `375224${randomDigits}2`,
          authorityFields,
        ).then((id) => {
          testData.authorityId2 = id;
        });
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
          ...marcBibFields(`${instanceTitlePrefix}_1`),
          ...precedingSubjectFields,
        ]).then((id) => {
          testData.instanceId1 = id;
        });
        cy.createMarcBibliographicViaAPI(
          QuickMarcEditor.defaultValidLdr,
          marcBibFields(`${instanceTitlePrefix}_2`),
        ).then((id) => {
          testData.instanceId2 = id;
        });
      })
        .then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId: testData.instanceId1,
            authorityIds: [testData.authorityId1],
            bibFieldTags: [tags.tag650],
            authorityFieldTags: [tags.tag150],
            finalBibFieldContents: [`$a ${authorityHeading}`],
          });
        })
        .then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId: testData.instanceId2,
            authorityIds: [testData.authorityId2],
            bibFieldTags: [tags.tag650],
            authorityFieldTags: [tags.tag150],
            finalBibFieldContents: [`$a ${authorityHeading}`],
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId1);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId2);
      MarcAuthority.deleteViaAPI(testData.authorityId1, true);
      MarcAuthority.deleteViaAPI(testData.authorityId2, true);
    });

    it(
      'C375224 Browse | Display records with same values in "Subject" field and linked to different "MARC authority" records (promin) (TaaS)',
      { tags: ['extendedPath', 'promin', 'C375224'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventorySearchAndFilter.selectBrowseSubjects();
        precedingSubjectValues.forEach((value) => {
          BrowseSubjects.waitForSubjectToAppear(value);
        });
        BrowseSubjects.waitForSubjectToAppear(authorityHeading, true, true, { allLinked: true });
        InventorySearchAndFilter.browseSearch(authorityHeading);
        BrowseSubjects.checkAuthorityIconAndValueDisplayedForRow(5, authorityHeading);
        BrowseSubjects.checkAuthorityIconAndValueDisplayedForRow(6, authorityHeading);
        BrowseSubjects.verifyNumberOfTitlesForRow(5, 1);
        BrowseSubjects.verifyNumberOfTitlesForRow(6, 1);
      },
    );
  });
});
