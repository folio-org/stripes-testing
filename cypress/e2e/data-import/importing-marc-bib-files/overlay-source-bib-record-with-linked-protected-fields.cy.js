import { Permissions } from '../../../support/dictionary';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(15);
    const authData = { prefix: randomLetters, startWithNumber: 380520 };

    const tags = {
      tag008: '008',
      tag100: '100',
      tag150: '150',
      tag240: '240',
      tag245: '245',
      tag650: '650',
      tag700: '700',
    };

    const testData = {
      instanceTitle: `AT_C380520_MarcBibInstance_${randomPostfix}`,
      oclcIdentifier: '1030444295',
      oclcTitle: 'Beethoven / Joan Stoltman.',
    };

    const authorityHeadings = {
      beethoven: `AT_C380520_MarcAuthority_Beethoven_${randomPostfix}`,
      beethovenVariations: `AT_C380520_MarcAuthority_BeethovenVariations_${randomPostfix}`,
      pianoMusic: `AT_C380520_MarcAuthority_PianoMusic_${randomPostfix}`,
      hewitt: `AT_C380520_MarcAuthority_Hewitt_${randomPostfix}`,
    };

    const authorityFields1 = [
      { tag: tags.tag100, content: `$a ${authorityHeadings.beethoven},`, indicators: ['1', '\\'] },
    ];
    const authorityFields2 = [
      {
        tag: tags.tag100,
        content: `$t ${authorityHeadings.beethovenVariations}.`,
        indicators: ['1', '\\'],
      },
    ];
    const authorityFields3 = [
      { tag: tags.tag150, content: `$a ${authorityHeadings.pianoMusic}`, indicators: ['\\', '\\'] },
    ];
    const authorityFields4 = [
      { tag: tags.tag100, content: `$a ${authorityHeadings.hewitt},`, indicators: ['1', '\\'] },
    ];

    const bibFields = [
      { tag: tags.tag008, content: QuickMarcEditor.valid008ValuesInstance },
      {
        tag: tags.tag245,
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '1'],
      },
      {
        tag: tags.tag100,
        content: `$a ${authorityHeadings.beethoven},`,
        indicators: ['1', '\\'],
      },
      {
        tag: tags.tag240,
        content: `$a ${authorityHeadings.beethovenVariations}.`,
        indicators: ['1', '0'],
      },
      {
        tag: tags.tag650,
        content: `$a ${authorityHeadings.pianoMusic}`,
        indicators: ['\\', '0'],
      },
      {
        tag: tags.tag700,
        content: `$a ${authorityHeadings.hewitt},`,
        indicators: ['1', '\\'],
      },
    ];

    // protection: "100 * * 0 *", "650 * * 0 *", "700 * * 9 *"
    const protectedFields = [
      {
        field: tags.tag100,
        indicator1: '*',
        indicator2: '*',
        subfield: '0',
        data: '*',
        source: 'USER',
      },
      {
        field: tags.tag650,
        indicator1: '*',
        indicator2: '*',
        subfield: '0',
        data: '*',
        source: 'USER',
      },
      {
        field: tags.tag700,
        indicator1: '*',
        indicator2: '*',
        subfield: '9',
        data: '*',
        source: 'USER',
      },
    ];
    const protectedFieldIds = [];

    let user;
    let bibId;
    const createdAuthorityIds = [];

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        protectedFieldIds.forEach((id) => MarcFieldProtection.deleteViaApi(id, true));
        if (bibId) InventoryInstance.deleteInstanceViaApi(bibId);
        createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
      });
    });

    it(
      'C380520 Use "Overlay source bibliographic record" on record which has linked and protected fields (promin)',
      { tags: ['extendedPath', 'promin', 'nonParallel', 'C380520'] },
      () => {
        // preconditions moved to test body to make sure cleanup in 'after' block always runs
        cy.then(() => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C380520_');
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C380520_');

          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiInventorySingleRecordImport.gui,
          ]).then((userProperties) => {
            user = userProperties;

            Z3950TargetProfiles.changeOclcWorldCatValueViaApi();

            cy.then(() => {
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields1,
              ).then((id) => {
                createdAuthorityIds.push(id);
              });
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber + 1,
                authorityFields2,
              ).then((id) => {
                createdAuthorityIds.push(id);
              });
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber + 2,
                authorityFields3,
              ).then((id) => {
                createdAuthorityIds.push(id);
              });
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber + 3,
                authorityFields4,
              ).then((id) => {
                createdAuthorityIds.push(id);
              });
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                (id) => {
                  bibId = id;
                },
              );
            })
              .then(() => {
                // Link bib 100→auth1(100), 240→auth2(100), 650→auth3(150), 700→auth4(100)
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId,
                  authorityIds: createdAuthorityIds,
                  bibFieldTags: [tags.tag100, tags.tag240, tags.tag650, tags.tag700],
                  authorityFieldTags: [tags.tag100, tags.tag100, tags.tag150, tags.tag100],
                  finalBibFieldContents: [
                    `$a ${authorityHeadings.beethoven},`,
                    `$a ${authorityHeadings.beethovenVariations}.`,
                    `$a ${authorityHeadings.pianoMusic}`,
                    `$a ${authorityHeadings.hewitt},`,
                  ],
                });
              })
              .then(() => {
                // Create field protection rules via API
                protectedFields.forEach((rule) => {
                  MarcFieldProtection.createViaApi(rule).then((resp) => {
                    protectedFieldIds.push(resp.id);
                  });
                });
              })
              .then(() => {
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              });
          });
        }).then(() => {
          // Step 1: Open Instance record with linked MARC authority fields
          InventoryInstances.searchByTitle(bibId);
          InventoryInstances.selectInstanceById(bibId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 2: Click Actions → Overlay source bibliographic record; verify Re-import modal
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.singleOverlaySourceBibRecordModalIsPresented();

          // Steps 3-4: Fill OCLC identifier and click Import; verify success notification
          InventoryInstance.overlayWithOclc(testData.oclcIdentifier);
          InventoryInstance.waitLoading();
          InteractorsTools.checkCalloutContainsMessage('');
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.verifyInstanceTitle(testData.oclcTitle);

          // Step 5: Open edit MARC bib; verify linked+protected fields (100, 650, 700) are unchanged
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyRowLinkedByTag(tags.tag100, {
            contentPart: `$a ${authorityHeadings.beethoven}`,
          });
          QuickMarcEditor.verifyRowLinkedByTag(tags.tag650, {
            contentPart: `$a ${authorityHeadings.pianoMusic}`,
          });
          QuickMarcEditor.verifyRowLinkedByTag(tags.tag700, {
            contentPart: `$a ${authorityHeadings.hewitt}`,
          });
        });
      },
    );
  });
});
