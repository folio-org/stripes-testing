import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit linked MARC authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `610248${randomNDigitNumber(15)}`;
      const LINKED_RECORDS_COUNT = 200;

      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag245: '245',
        tag700: '700',
        authorityNaturalId: `n${randomDigits}`,
        auth100Content: `$a AT_C610248_MarcAuthority_Lee_Stan_${randomPostfix}, $d 1922-2018`,
        auth100UpdatedContent: `$a Load200records AT_C610248_MarcAuthority_Lee_Stan_${randomPostfix}, $d 1922-2018`,
        authorityHeadingStable: `AT_C610248_MarcAuthority_Lee_Stan_${randomPostfix}`,
        bibTitle: `AT_C610248_MarcBibInstance_${randomPostfix}`,
        bib700InitialContent: `$a AT_C610248_MarcAuthority_Lee_Stan_${randomPostfix}, $d 1922-2018`,
        expectedContributorName: `Load200records AT_C610248_MarcAuthority_Lee_Stan_${randomPostfix}, 1922-2018`,
        instanceSearchOption: 'Authority UUID',
        contributorAccordionName: 'Contributor',
        authoritySearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
      };

      let userData;
      let authorityId;
      const createdBibIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C610248_');
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C610248_');

        cy.then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI('', testData.authorityNaturalId, [
            {
              tag: testData.tag010,
              content: `$a ${testData.authorityNaturalId}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag100,
              content: testData.auth100Content,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            authorityId = id;
          });

          for (let i = 0; i < LINKED_RECORDS_COUNT; i++) {
            if (!(i % 20)) cy.getAdminToken(false);
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              { tag: testData.tag008, content: QuickMarcEditor.valid008ValuesInstance },
              {
                tag: testData.tag245,
                content: `$a ${testData.bibTitle}_${i}`,
                indicators: ['1', '1'],
              },
              {
                tag: testData.tag700,
                content: '$a placeholder',
                indicators: ['1', '\\'],
              },
            ]).then((instanceId) => {
              createdBibIds.push(instanceId);
            });
          }
        })
          .then(() => {
            createdBibIds.forEach((bibId, index) => {
              if (!(index % 20)) cy.getAdminToken(false);
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId,
                authorityIds: [authorityId],
                bibFieldTags: [testData.tag700],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [testData.bib700InitialContent],
              });
            });
            MarcAuthorities.waitAuthorityLinked(authorityId, LINKED_RECORDS_COUNT);
          })
          .then(() => {
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]).then((userProperties) => {
              userData = userProperties;
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(authorityId, true);
        Users.deleteViaApi(userData?.userId);
        createdBibIds.forEach((id, index) => {
          if (index && !(index % 20)) cy.getAdminToken(false);
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C610248 Check that controlled fields of 200 MARC bibs are updated after edit of "MARC authority" 1XX field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C610248'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });

          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityNaturalId);
          MarcAuthorities.selectAuthorityById(authorityId);
          MarcAuthority.waitLoading();

          // Step 1: Edit authority - open edit pane
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          cy.wait(2000);

          // Step 2: Update $a of 100 field with "Load test 200 records" prefix
          QuickMarcEditor.updateExistingField(testData.tag100, testData.auth100UpdatedContent);
          QuickMarcEditor.checkContentByTag(testData.tag100, testData.auth100UpdatedContent);

          // Step 3: Save & close, confirm "Are you sure?" modal for linked bib updates
          QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });
          MarcAuthority.waitLoading();

          // Step 4: Close detail view, verify "200" hyperlink in Number of titles column
          MarcAuthorities.closeMarcViewPane();

          // Step 5: Click "200" hyperlink → redirected to Inventory with 200 results
          MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(
            testData.authorityHeadingStable,
            LINKED_RECORDS_COUNT,
          );
          InventoryInstances.waitLoading();
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.instanceSearchOption);
          InventoryInstances.checkRecordsCounter(LINKED_RECORDS_COUNT);

          // Open first linked instance and verify Contributor field is updated with authority icon
          InventoryInstances.selectInstance(0);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.verifyContributorWithMarcAppLink(
            0,
            1,
            testData.expectedContributorName,
          );
          InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
            testData.contributorAccordionName,
          );

          // Step 6: API check - verify all 200 linked instances have updated contributor name
          cy.getAdminToken(false);
          cy.getInstances({
            limit: LINKED_RECORDS_COUNT,
            query: `title="${testData.bibTitle}"`,
          }).then((instances) => {
            expect(instances.length).to.equal(LINKED_RECORDS_COUNT);
            expect(
              instances.every((instance) => instance.contributors
                .map((contr) => contr.name)
                .includes(testData.expectedContributorName)),
              'Every instance should have the expected contributor name',
            ).to.eq(true);
          });
        },
      );
    });
  });
});
