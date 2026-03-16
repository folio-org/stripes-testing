import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { getRandomLetters } from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomLetters = getRandomLetters(15);
          const sharedPaneheaderText = 'Edit shared MARC record';
          const tags = {
            tag008: '008',
            tag111: '111',
            tag150: '150',
            tag245: '245',
            tag650: '650',
            tag711: '711',
          };
          const errorTexts = {
            controlledSubfieldsErrorTxt:
              'Fail: A subfield(s) cannot be updated because it is controlled by an authority heading.',
            nonRepeatableSubfieldsBErrorTxt: "Fail: Subfield 'b' is non-repeatable.",
            nonRepeatableSubfields2ErrorTxt: "Fail: Subfield '2' is non-repeatable.",
          };
          const bibField650Index = 5;
          const bibTitle = `AT_C407692_MarcBibInstance_${randomPostfix}`;
          const authorityHeadingPrefix = `AT_C407692_MarcAuthority_${randomPostfix}`;
          const bibSubfields650 = {
            a: 'C407692 Field650',
          };
          const bibSubfields711 = {
            a: 'C407692 Field711',
            e: 'Orch.',
            4: 'prf',
            v: 'version 1',
          };
          const authSubfields150 = {
            a: `${authorityHeadingPrefix}_Shared1`,
            x: 'History',
          };
          const authSubfields111 = {
            a: `${authorityHeadingPrefix}_Shared2`,
            e: 'Orchestra',
            t: 'sonet',
            3: 'test',
            w: 'control',
          };
          const authData = { prefix: randomLetters, startWithNumber: 407692000 };
          const authorityFields150 = [
            {
              tag: tags.tag150,
              content: Object.entries(authSubfields150)
                .reduce((acc, [subfield, value]) => `${acc} $${subfield} ${value}`, '')
                .trim(),
              indicators: ['\\', '\\'],
            },
          ];
          const authorityFields111 = [
            {
              tag: tags.tag111,
              content: Object.entries(authSubfields111)
                .reduce((acc, [subfield, value]) => `${acc} $${subfield} ${value}`, '')
                .trim(),
              indicators: ['2', '\\'],
            },
          ];
          const bibFields = [
            {
              tag: tags.tag008,
              content: QuickMarcEditor.valid008ValuesInstance,
            },
            {
              tag: tags.tag245,
              content: `$a ${bibTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: tags.tag650,
              content: Object.entries(bibSubfields650)
                .reduce((acc, [subfield, value]) => `${acc} $${subfield} ${value}`, '')
                .trim(),
              indicators: ['\\', '0'],
            },
            {
              tag: tags.tag711,
              content: Object.entries(bibSubfields711)
                .reduce((acc, [subfield, value]) => `${acc} $${subfield} ${value}`, '')
                .trim(),
              indicators: ['\\', '0'],
            },
          ];
          const linkedFieldData650 = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            controlledLetterSubfields: `$a ${authSubfields150.a}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedFieldData711 = {
            tag: bibFields[3].tag,
            ind1: bibFields[3].indicators[0],
            ind2: bibFields[3].indicators[1],
            controlledLetterSubfields: `$a ${authSubfields111.a} $e ${authSubfields111.e} $t ${authSubfields111.t}`,
            uncontrolledLetterSubfields: `$v ${bibSubfields711.v}`,
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 1}`,
            uncontrolledDigitSubfields: `$4 ${bibSubfields711['4']}`,
          };
          const fieldEditData = [
            { row: bibField650Index, boxNumber: 5, value: '$b one $b two' },
            { row: bibField650Index, boxNumber: 7, value: '$2 first $2 second' },
            { row: bibField650Index + 1, boxNumber: 5, value: '' },
            { row: bibField650Index + 1, boxNumber: 7, value: '$4 new' },
          ];
          const lastEditData = [
            { row: bibField650Index, boxNumber: 5, value: '' },
            { row: bibField650Index, boxNumber: 7, value: '$2 first' },
          ];
          const linkedFieldData650Updated = {
            tag: linkedFieldData650.tag,
            ind1: linkedFieldData650.ind1,
            ind2: linkedFieldData650.ind2,
            controlledLetterSubfields: linkedFieldData650.controlledLetterSubfields,
            uncontrolledLetterSubfields: linkedFieldData650.uncontrolledLetterSubfields,
            controlledDigitSubfields: linkedFieldData650.controlledDigitSubfields,
            uncontrolledDigitSubfields: lastEditData[1].value,
          };
          const linkedFieldData711Updated = {
            tag: linkedFieldData711.tag,
            ind1: linkedFieldData711.ind1,
            ind2: linkedFieldData711.ind2,
            controlledLetterSubfields: linkedFieldData711.controlledLetterSubfields,
            uncontrolledLetterSubfields: fieldEditData[2].value,
            controlledDigitSubfields: linkedFieldData711.controlledDigitSubfields,
            uncontrolledDigitSubfields: fieldEditData[3].value,
          };
          const userPermissions = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ];

          let user;
          let createdInstanceId;
          const createdAuthorityIds = [];

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407692');
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C407692');

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields150,
              ).then((createdRecordId1) => {
                createdAuthorityIds.push(createdRecordId1);

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + 1,
                  authorityFields111,
                ).then((createdRecordId2) => {
                  createdAuthorityIds.push(createdRecordId2);
                });
              });
            })
              .then(() => {
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: createdInstanceId,
                  authorityIds: createdAuthorityIds,
                  bibFieldTags: [linkedFieldData650.tag, linkedFieldData711.tag],
                  authorityFieldTags: [authorityFields150[0].tag, authorityFields111[0].tag],
                  finalBibFieldContents: [
                    linkedFieldData650.controlledLetterSubfields,
                    `${linkedFieldData711.controlledLetterSubfields} ${linkedFieldData711.uncontrolledLetterSubfields} ${linkedFieldData711.uncontrolledDigitSubfields}`,
                  ],
                });
              })
              .then(() => {
                cy.resetTenant();
                cy.createTempUser(userPermissions).then((createdUserProperties) => {
                  user = createdUserProperties;
                  cy.assignAffiliationToUser(Affiliations.College, user.userId);

                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(user.userId, userPermissions);
                });
              })
              .then(() => {
                cy.resetTenant();
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C407692 Edit subfields in a linked field of "MARC Bib" in Central tenant (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407692'] },
            () => {
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.checkPaneheaderContains(sharedPaneheaderText);
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData650));
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData711));

              fieldEditData.forEach(({ row, boxNumber, value }) => {
                QuickMarcEditor.fillLinkedFieldBox(row, boxNumber, value);
              });

              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkErrorMessage(
                bibField650Index,
                errorTexts.controlledSubfieldsErrorTxt,
              );
              QuickMarcEditor.checkErrorMessage(
                bibField650Index,
                errorTexts.nonRepeatableSubfieldsBErrorTxt,
              );
              QuickMarcEditor.checkErrorMessage(
                bibField650Index,
                errorTexts.nonRepeatableSubfields2ErrorTxt,
              );

              lastEditData.forEach(({ row, boxNumber, value }) => {
                QuickMarcEditor.fillLinkedFieldBox(row, boxNumber, value);
              });
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              InventorySearchAndFilter.clearDefaultHeldbyFilter();

              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();

              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIconByTag(tags.tag650);
              InventoryViewSource.verifyLinkedToAuthorityIconByTag(tags.tag711);
              InventoryViewSource.checkRowExistsWithTagAndValue(
                tags.tag650,
                `${linkedFieldData650.controlledLetterSubfields} $0 ${authData.prefix}${authData.startWithNumber} $9 ${createdAuthorityIds[0]} ${lastEditData[1].value}`,
              );
              InventoryViewSource.checkRowExistsWithTagAndValue(
                tags.tag711,
                `${linkedFieldData711.controlledLetterSubfields} $0 ${authData.prefix}${authData.startWithNumber + 1} $9 ${createdAuthorityIds[1]} ${fieldEditData[3].value}`,
              );

              InventoryViewSource.close();
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.verifyRowLinked(bibField650Index);
              QuickMarcEditor.verifyRowLinked(bibField650Index + 1);
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                ...Object.values(linkedFieldData650Updated),
              );
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                ...Object.values(linkedFieldData711Updated),
              );
            },
          );
        });
      });
    });
  });
});
