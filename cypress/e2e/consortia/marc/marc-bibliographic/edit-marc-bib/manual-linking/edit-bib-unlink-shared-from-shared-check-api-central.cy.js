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
            tag100: '100',
            tag245: '245',
          };
          const bibTitle = `AT_C423378_MarcBibInstance_${randomPostfix}`;
          const authorityHeading = `AT_C423378_MarcAuthority_${randomPostfix}`;
          const bibNotControllableSubfield = '$e author.';
          const authData = { prefix: randomLetters, startWithNumber: 1 };
          const authorityFields1 = [
            {
              tag: tags.tag100,
              content: `$a ${authorityHeading}`,
              indicators: ['1', '\\'],
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
              tag: tags.tag100,
              content: `${authorityFields1[0].content} ${bibNotControllableSubfield}`,
              indicators: ['1', '\\'],
            },
          ];
          const linkedFieldData = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeading}`,
            uncontrolledLetterSubfields: bibNotControllableSubfield,
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const unlinkedFieldData = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            content: `${authorityFields1[0].content} ${bibNotControllableSubfield} $0 ${authData.prefix}${authData.startWithNumber}`,
          };
          const userPermissionsCentral = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ];

          let user;
          let createdInstanceId;
          let createdAuthorityId;

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423378');
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C423378');

            cy.createTempUser(userPermissionsCentral).then((createdUserProperties) => {
              user = createdUserProperties;

              cy.then(() => {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                  (instanceId) => {
                    createdInstanceId = instanceId;
                  },
                );

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber,
                  authorityFields1,
                ).then((createdRecordId) => {
                  createdAuthorityId = createdRecordId;
                });
              }).then(() => {
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: createdInstanceId,
                  authorityIds: [createdAuthorityId],
                  bibFieldTags: [tags.tag100],
                  authorityFieldTags: [tags.tag100],
                  finalBibFieldContents: [
                    `${authorityFields1[0].content} ${bibNotControllableSubfield}`,
                  ],
                });
              });
            });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthority.deleteViaAPI(createdAuthorityId);
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C423378 API | Unlink Shared MARC bib from Shared MARC auth on Central tenant and check "/links/instances/" endpoint (consortia) (spitfire)',
            { tags: ['criticalPathECS', 'spitfire', 'C423378'] },
            () => {
              cy.then(() => {
                cy.resetTenant();
                cy.getAdminToken();
                cy.getInstanceLinks(createdInstanceId).then((response) => {
                  expect(response.status).to.equal(200);
                  expect(response.body.links).to.have.lengthOf(1);
                  expect(response.body.totalRecords).to.equal(1);
                  expect(response.body.links[0].status).to.equal('ACTUAL');
                  expect(response.body.links[0].authorityId).to.equal(createdAuthorityId);
                  expect(response.body.links[0].instanceId).to.equal(createdInstanceId);
                  expect(response.body.links[0]).to.haveOwnProperty('authorityNaturalId');
                  expect(response.body.links[0]).to.haveOwnProperty('linkingRuleId');
                });
              })
                .then(() => {
                  // TO DO: uncomment when MODELINKS-171 is done:
                  // cy.setTenant(Affiliations.College);
                  // cy.getInstanceLinks(createdInstanceId).then((response) => {
                  //   expect(response.status).to.equal(200);
                  //   expect(response.body.links).to.have.lengthOf(1);
                  //   expect(response.body.totalRecords).to.equal(1);
                  //   expect(response.body.links[0].status).to.equal('ACTUAL');
                  //   expect(response.body.links[0].authorityId).to.equal(createdAuthorityId);
                  //   expect(response.body.links[0].instanceId).to.equal(createdInstanceId);
                  //   expect(response.body.links[0]).to.haveOwnProperty('authorityNaturalId');
                  //   expect(response.body.links[0]).to.haveOwnProperty('linkingRuleId');
                  // });
                })
                .then(() => {
                  cy.resetTenant();
                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

                  InventoryInstances.searchByTitle(createdInstanceId);
                  InventoryInstances.selectInstanceById(createdInstanceId);
                  InventoryInstance.waitLoading();
                  InventoryInstance.editMarcBibliographicRecord();
                  QuickMarcEditor.checkPaneheaderContains(sharedPaneheaderText);
                  QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                    ...Object.values(linkedFieldData),
                  );

                  QuickMarcEditor.clickUnlinkIconInFieldByTag(linkedFieldData.tag);
                  QuickMarcEditor.confirmUnlinkingField();
                  QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
                    ...Object.values(unlinkedFieldData),
                  );

                  QuickMarcEditor.clickSaveAndKeepEditing();
                  QuickMarcEditor.checkAfterSaveAndKeepEditing();
                  QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
                    ...Object.values(unlinkedFieldData),
                  );
                })
                .then(() => {
                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.getInstanceLinks(createdInstanceId).then((response) => {
                    expect(response.status).to.equal(200);
                    expect(response.body.links).to.have.lengthOf(0);
                    expect(response.body.totalRecords).to.equal(0);
                  });
                })
                .then(() => {
                  cy.setTenant(Affiliations.College);
                  cy.getInstanceLinks(createdInstanceId).then((response) => {
                    expect(response.status).to.equal(200);
                    expect(response.body.links).to.have.lengthOf(0);
                    expect(response.body.totalRecords).to.equal(0);
                  });
                });
            },
          );
        });
      });
    });
  });
});
