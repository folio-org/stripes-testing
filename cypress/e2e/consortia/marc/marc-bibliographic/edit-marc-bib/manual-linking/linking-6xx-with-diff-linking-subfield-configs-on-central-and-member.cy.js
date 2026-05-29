import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../../support/dictionary/permissions';
import CapabilitySets from '../../../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../../support/fragments/topMenu';
import Users from '../../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          calloutUpdatedRecord:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
          heldByAccordionName: 'Held by',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC770440.mrc',
            fileName: `testMarcBibFileC770440.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC770440.mrc',
            fileName: `testMarcAuthFileC770440.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];

        // Central tenant subfield linking rules for 6XX fields
        const centralAuthoritySubfields = [
          {
            ruleId: '8',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'j',
              'q',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
              'v',
              'x',
              'y',
              'z',
            ],
          },
          {
            ruleId: '9',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
              'v',
              'x',
              'y',
              'z',
            ],
          },
          {
            ruleId: '10',
            ruleSubfields: ['a', 'c', 'e', 'q', 'f', 'h', 'k', 'l', 'p', 's', 't', 'd', 'g', 'n'],
          },
          {
            ruleId: '11',
            ruleSubfields: ['a', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't'],
          },
          {
            ruleId: '12',
            ruleSubfields: ['a'],
          },
          {
            ruleId: '13',
            ruleSubfields: ['a'],
          },
          {
            ruleId: '14',
            ruleSubfields: ['a', 'v', 'x', 'y', 'z'],
          },
        ];

        // Member tenant subfield linking rules for 6XX fields (differ from Central)
        const memberAuthoritySubfields = [
          {
            ruleId: '8',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'j',
              'q',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
            ],
          },
          {
            ruleId: '9',
            ruleSubfields: [
              'a',
              'b',
              'c',
              'd',
              'g',
              'f',
              'h',
              'k',
              'l',
              'm',
              'n',
              'o',
              'p',
              'r',
              's',
              't',
            ],
          },
          {
            ruleId: '10',
            ruleSubfields: [
              'a',
              'c',
              'e',
              'q',
              'f',
              'h',
              'k',
              'l',
              'p',
              's',
              't',
              'd',
              'g',
              'n',
              'v',
              'x',
              'y',
              'z',
            ],
          },
          {
            ruleId: '11',
            ruleSubfields: ['a'],
          },
          {
            ruleId: '12',
            ruleSubfields: ['a', 'b', 'g', 'v', 'x', 'y', 'z'],
          },
          {
            ruleId: '13',
            ruleSubfields: ['a', 'g', 'v', 'x', 'y', 'z'],
          },
          {
            ruleId: '14',
            ruleSubfields: ['a'],
          },
        ];

        const bib6XXAfterLinkingToAuth1XX = [
          {
            browseSearchOption: 'nameTitle',
            browseValue:
              'Black Panther Numeration (Fictitious character) second title Dates associated with a name Miscellaneous information Attribution qualifier Fuller form of name Date of a work Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Wakanda Forever Form subdivision General subdivision Chronological subdivision Geographic subdivision',
            searchValue: 'Black Panther Numeration (Fictitious character) Dates',
            rowIndex: 45,
            tagValue: '600',
            secondBox: '0',
            thirdBox: '0',
            fourthBox:
              '$a Black Panther $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '$e Relator term',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n2016004082',
            seventhBox: '$4 .prt $2 test',
          },
          {
            browseSearchOption: 'nameTitle',
            browseValue:
              'Radio Roma. Hrvatski program Location of meeting Date of meeting or treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key for music Version Title of a work Form subdivision General subdivision Chronological subdivision Geographic subdivision',
            searchValue: 'Radio Roma. Hrvatski program Location of meeting Date',
            rowIndex: 46,
            tagValue: '610',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox:
              '$a Radio Roma. $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '$e Relator term $u Affiliation',
            sixthBox: '$0 4510955',
            seventhBox: '',
          },
          {
            browseSearchOption: 'nameTitle',
            browseValue:
              'Roma Council Location of meeting Date Subordinate unit Date of a work Inf Medium Form subheading Language of a work Nou Name of meeting following jurisdiction name entry element Name of part/section of a work Version Title of a work',
            searchValue: 'Roma Council Location of meeting Date of meeting',
            rowIndex: 47,
            tagValue: '611',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox:
              '$a Roma Council $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work',
            fifthBox:
              '$b Subordinate unit $m Moo $o Opps $r right $u Date of meeting or treaty signing $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n79084170',
            seventhBox: '',
          },
          {
            browseSearchOption: 'uniformTitle',
            browseValue:
              'Marvel comics Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work',
            searchValue: 'Marvel comics Date of treaty signing Date',
            rowIndex: 48,
            tagValue: '630',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox:
              '$a Marvel comics $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work',
            fifthBox:
              '$e Term $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n80026955',
            seventhBox: '',
          },
          {
            browseSearchOption: 'subject',
            browseValue: 'Speaking Oratory',
            searchValue: 'Speaking Oratory debating Form subdivision',
            rowIndex: 49,
            tagValue: '650',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a Speaking Oratory',
            fifthBox:
              '$b debating $c Location $d Date $e Term $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            sixthBox: '$0 http://id.loc.gov/authorities/subjects/sh85095298',
            seventhBox: '',
          },
          {
            browseSearchOption: 'geographicName',
            browseValue: 'Clear Creek (Tex.)',
            searchValue: 'Clear Creek (Tex.) Place in Texas Form subdivision',
            rowIndex: 50,
            tagValue: '651',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a Clear Creek (Tex.)',
            fifthBox:
              '$e Term $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n79041363',
            seventhBox: '$4 Test',
          },
          {
            browseSearchOption: 'genre',
            browseValue:
              'Drama Form subdivision General subdivision Chronological subdivision Geographic subdivision',
            searchValue: 'Drama Form subdivision General subdivision',
            rowIndex: 51,
            tagValue: '655',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox:
              '$a Drama $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '$b Bowl $c Chicken',
            sixthBox: '$0 http://id.loc.gov/authorities/genreForms/gf2014026297',
            seventhBox: '$7 Luck',
          },
        ];

        const users = {};

        before('Create user, set linking rules, import test data', () => {
          cy.getAdminToken();

          // Set Central tenant subfield linking rules
          centralAuthoritySubfields.forEach((tag) => {
            QuickMarcEditor.setAuthoritySubfieldsViaApi(tag.ruleId, tag.ruleSubfields);
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              users.userProperties = userProperties;

              if (Cypress.env('eureka')) {
                cy.assignCapabilitiesToExistingUser(
                  users.userProperties.userId,
                  [],
                  [
                    CapabilitySets.uiInventoryInstanceView,
                    CapabilitySets.uiQuickMarcQuickMarcEditor,
                    CapabilitySets.uiQuickMarcQuickMarcAuthorityRecordsLinkUnlink,
                    CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
                  ],
                );
              }
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.setTenant(Affiliations.College);

              if (Cypress.env('eureka')) {
                cy.assignCapabilitiesToExistingUser(
                  users.userProperties.userId,
                  [],
                  [
                    CapabilitySets.uiInventoryInstanceView,
                    CapabilitySets.uiQuickMarcQuickMarcEditor,
                    CapabilitySets.uiQuickMarcQuickMarcAuthorityRecordsLinkUnlink,
                    CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
                  ],
                );
              } else {
                cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                  Permissions.inventoryAll.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                  Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
                ]);
              }

              // Set Member tenant subfield linking rules
              memberAuthoritySubfields.forEach((tag) => {
                QuickMarcEditor.setAuthoritySubfieldsViaApi(tag.ruleId, tag.ruleSubfields);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken();

              // Import MARC bib and authority files on Central tenant
              marcFiles.forEach((marcFile) => {
                DataImport.uploadFileViaApi(
                  marcFile.marc,
                  marcFile.fileName,
                  marcFile.jobProfileToRun,
                ).then((response) => {
                  response.forEach((record) => {
                    createdRecordIDs.push(record[marcFile.propertyName].id);
                  });
                });
              });

              cy.waitForAuthRefresh(() => {
                cy.login(users.userProperties.username, users.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
                cy.reload();
                InventoryInstances.waitContentLoading();
              }, 20_000);

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete user, reset linking rules, delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Reset Central tenant subfield linking rules to defaults
          QuickMarcEditor.setAuthoritySubfieldsDefault();

          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          createdRecordIDs.slice(1).forEach((id) => MarcAuthority.deleteViaAPI(id));

          // Reset Member tenant subfield linking rules to defaults
          cy.setTenant(Affiliations.College);
          QuickMarcEditor.setAuthoritySubfieldsDefault();
        });

        it(
          'C770440 Link "Subjects" (6XX) fields of shared MARC bib from Member tenant when Central and Member tenants have different linkable subfields configured (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C770440'] },
          () => {
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // Step 1: Edit MARC bibliographic record
            InventoryInstance.editMarcBibliographicRecord();

            // Steps 2-15: Link each 6XX field to corresponding MARC authority
            bib6XXAfterLinkingToAuth1XX.forEach((field) => {
              InventoryInstance.verifyAndClickLinkIcon(field.tagValue);
              MarcAuthorities.checkSearchOption(field.browseSearchOption);
              MarcAuthorities.checkSearchInput(field.browseValue);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.searchResults(field.searchValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(field.tagValue);
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                field.tagValue,
                field.secondBox,
                field.thirdBox,
                field.fourthBox,
                field.fifthBox,
                field.sixthBox,
                field.seventhBox,
              );
            });

            // Step 16: Click "Save & keep editing"
            QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutUpdatedRecord);

            // Verify all 6XX fields remain linked after save
            bib6XXAfterLinkingToAuth1XX.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                field.tagValue,
                field.secondBox,
                field.thirdBox,
                field.fourthBox,
                field.fifthBox,
                field.sixthBox,
                field.seventhBox,
              );
            });

            // Step 17: Switch active affiliation to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Step 18: Find linked MARC bibliographic record on Central tenant
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            // Step 19: Edit MARC bibliographic record on Central tenant
            // Verify all linked fields retain same controlled/not controlled subfields
            InventoryInstance.editMarcBibliographicRecord();
            bib6XXAfterLinkingToAuth1XX.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                field.tagValue,
                field.secondBox,
                field.thirdBox,
                field.fourthBox,
                field.fifthBox,
                field.sixthBox,
                field.seventhBox,
              );
            });

            QuickMarcEditor.closeEditorPane();
          },
        );
      });
    });
  });
});
