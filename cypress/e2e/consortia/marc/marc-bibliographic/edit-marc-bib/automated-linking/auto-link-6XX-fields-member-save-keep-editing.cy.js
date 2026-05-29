import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import { Permissions } from '../../../../../../support/dictionary';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../../support/fragments/topMenu';
import Users from '../../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          fields: {
            tag600: {
              tag: '600',
              rowIndex: 45,
              ind1: '0',
              ind2: '0',
              controlled:
                '$a Black Panther $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              eSubfield: '$e Relator term',
              zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2016004082',
              seventhBox: '$4 .prt $2 test',
            },
            tag610: {
              tag: '610',
              rowIndex: 46,
              ind1: '\\',
              ind2: '\\',
              controlled:
                '$a Radio Roma. $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              eSubfield: '$e Relator term $u Affiliation',
              zeroSubfield: '$0 4510955',
              seventhBox: '',
            },
            tag611: {
              tag: '611',
              rowIndex: 47,
              ind1: '\\',
              ind2: '\\',
              controlled:
                '$a Roma Council $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work',
              eSubfield:
                '$b Subordinate unit $m Moo $o Opps $r right $u Date of meeting or treaty signing $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              zeroSubfield: '$0 http://id.loc.gov/authorities/names/n79084170',
              seventhBox: '',
            },
            tag630: {
              tag: '630',
              rowIndex: 48,
              ind1: '\\',
              ind2: '\\',
              controlled:
                '$a Marvel comics $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work',
              eSubfield:
                '$e Term $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              zeroSubfield: '$0 http://id.loc.gov/authorities/names/n80026955',
              seventhBox: '',
            },
            tag650: {
              tag: '650',
              rowIndex: 49,
              ind1: '\\',
              ind2: '\\',
              controlled: '$a Speaking Oratory',
              eSubfield:
                '$b debating $c Location $d Date $e Term $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              zeroSubfield: '$0 http://id.loc.gov/authorities/subjects/sh85095298',
              seventhBox: '',
            },
            tag651: {
              tag: '651',
              rowIndex: 50,
              ind1: '\\',
              ind2: '\\',
              controlled: '$a Clear Creek (Tex.)',
              eSubfield:
                '$e Term $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              zeroSubfield: '$0 http://id.loc.gov/authorities/names/n79041363',
              seventhBox: '$4 Test',
            },
            tag655: {
              tag: '655',
              rowIndex: 51,
              ind1: '\\',
              ind2: '\\',
              controlled:
                '$a Drama $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
              eSubfield: '$b Bowl $c Chicken',
              zeroSubfield: '$0 http://id.loc.gov/authorities/genreForms/gf2014026297',
              seventhBox: '$7 Luck',
            },
          },
        };

        const marcFiles = [
          {
            marc: 'marcBibFileC770443.mrc',
            fileName: `testMarcBibFileC770443.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC770443.mrc',
            fileName: `testMarcAuthFileC770443.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
        ];

        // ruleId mapping: 8→600, 9→610, 10→611, 11→630, 12→650, 13→651, 14→655
        const authoritySubfieldsCentral = [
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
            autoLinkingEnabled: true,
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
            autoLinkingEnabled: true,
          },
          {
            ruleId: '10',
            ruleSubfields: ['a', 'c', 'e', 'q', 'f', 'h', 'k', 'l', 'p', 's', 't', 'd', 'g', 'n'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '11',
            ruleSubfields: ['a', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '12',
            ruleSubfields: ['a'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '13',
            ruleSubfields: ['a'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '14',
            ruleSubfields: ['a', 'v', 'x', 'y', 'z'],
            autoLinkingEnabled: true,
          },
        ];

        const authoritySubfieldsMember = [
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
            autoLinkingEnabled: true,
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
            autoLinkingEnabled: true,
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
            autoLinkingEnabled: true,
          },
          {
            ruleId: '11',
            ruleSubfields: ['a'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '12',
            ruleSubfields: ['a', 'b', 'g', 'v', 'x', 'y', 'z'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '13',
            ruleSubfields: ['a', 'g', 'v', 'x', 'y', 'z'],
            autoLinkingEnabled: true,
          },
          {
            ruleId: '14',
            ruleSubfields: ['a'],
            autoLinkingEnabled: true,
          },
        ];

        const createdRecordIDs = [];
        const users = {};

        before('Create user, set linking rules, import data', () => {
          cy.getAdminToken();

          authoritySubfieldsCentral.forEach(({ ruleId, ruleSubfields, autoLinkingEnabled }) => {
            QuickMarcEditor.setAuthoritySubfieldsViaApi(ruleId, ruleSubfields, autoLinkingEnabled);
          });

          cy.setTenant(Affiliations.College);
          authoritySubfieldsMember.forEach(({ ruleId, ruleSubfields, autoLinkingEnabled }) => {
            QuickMarcEditor.setAuthoritySubfieldsViaApi(ruleId, ruleSubfields, autoLinkingEnabled);
          });
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              users.userProperties = userProperties;
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken();
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
            })
            .then(() => {
              cy.resetTenant();
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete user, data, restore linking rules', () => {
          cy.resetTenant();
          cy.getAdminToken();
          QuickMarcEditor.setAuthoritySubfieldsDefault();
          cy.setTenant(Affiliations.College);
          QuickMarcEditor.setAuthoritySubfieldsDefault();
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          createdRecordIDs.slice(1).forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C770443 ECS | Auto-link 6XX "MARC Bib" fields using "Link headings" on Member tenant and verify fields after "Save & keep editing" (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C770443'] },
          () => {
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            // Step 1: click Actions > Edit MARC bibliographic record
            InventoryInstance.editMarcBibliographicRecord();

            // Step 2: click "Link headings" – 600, 610, 611, 630, 650, 651, 655 are linked
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 600, 610, 611, 630, 650, 651, and 655 has been linked to MARC authority record(s).',
            );

            // Step 3: verify 600
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag600.rowIndex,
              testData.fields.tag600.tag,
              testData.fields.tag600.ind1,
              testData.fields.tag600.ind2,
              testData.fields.tag600.controlled,
              testData.fields.tag600.eSubfield,
              testData.fields.tag600.zeroSubfield,
              testData.fields.tag600.seventhBox,
            );

            // Step 4: verify 610
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag610.rowIndex,
              testData.fields.tag610.tag,
              testData.fields.tag610.ind1,
              testData.fields.tag610.ind2,
              testData.fields.tag610.controlled,
              testData.fields.tag610.eSubfield,
              testData.fields.tag610.zeroSubfield,
              testData.fields.tag610.seventhBox,
            );

            // Step 5: verify 611
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag611.rowIndex,
              testData.fields.tag611.tag,
              testData.fields.tag611.ind1,
              testData.fields.tag611.ind2,
              testData.fields.tag611.controlled,
              testData.fields.tag611.eSubfield,
              testData.fields.tag611.zeroSubfield,
              testData.fields.tag611.seventhBox,
            );

            // Step 6: verify 630
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag630.rowIndex,
              testData.fields.tag630.tag,
              testData.fields.tag630.ind1,
              testData.fields.tag630.ind2,
              testData.fields.tag630.controlled,
              testData.fields.tag630.eSubfield,
              testData.fields.tag630.zeroSubfield,
              testData.fields.tag630.seventhBox,
            );

            // Step 7: verify 650
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag650.rowIndex,
              testData.fields.tag650.tag,
              testData.fields.tag650.ind1,
              testData.fields.tag650.ind2,
              testData.fields.tag650.controlled,
              testData.fields.tag650.eSubfield,
              testData.fields.tag650.zeroSubfield,
              testData.fields.tag650.seventhBox,
            );

            // Step 8: verify 651
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag651.rowIndex,
              testData.fields.tag651.tag,
              testData.fields.tag651.ind1,
              testData.fields.tag651.ind2,
              testData.fields.tag651.controlled,
              testData.fields.tag651.eSubfield,
              testData.fields.tag651.zeroSubfield,
              testData.fields.tag651.seventhBox,
            );

            // Step 9: verify 655
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag655.rowIndex,
              testData.fields.tag655.tag,
              testData.fields.tag655.ind1,
              testData.fields.tag655.ind2,
              testData.fields.tag655.controlled,
              testData.fields.tag655.eSubfield,
              testData.fields.tag655.zeroSubfield,
              testData.fields.tag655.seventhBox,
            );

            // Step 10: click "Save & keep editing" – toast shown, pane stays open, fields remain linked
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();

            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag600.rowIndex,
              testData.fields.tag600.tag,
              testData.fields.tag600.ind1,
              testData.fields.tag600.ind2,
              testData.fields.tag600.controlled,
              testData.fields.tag600.eSubfield,
              testData.fields.tag600.zeroSubfield,
              testData.fields.tag600.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag610.rowIndex,
              testData.fields.tag610.tag,
              testData.fields.tag610.ind1,
              testData.fields.tag610.ind2,
              testData.fields.tag610.controlled,
              testData.fields.tag610.eSubfield,
              testData.fields.tag610.zeroSubfield,
              testData.fields.tag610.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag611.rowIndex,
              testData.fields.tag611.tag,
              testData.fields.tag611.ind1,
              testData.fields.tag611.ind2,
              testData.fields.tag611.controlled,
              testData.fields.tag611.eSubfield,
              testData.fields.tag611.zeroSubfield,
              testData.fields.tag611.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag630.rowIndex,
              testData.fields.tag630.tag,
              testData.fields.tag630.ind1,
              testData.fields.tag630.ind2,
              testData.fields.tag630.controlled,
              testData.fields.tag630.eSubfield,
              testData.fields.tag630.zeroSubfield,
              testData.fields.tag630.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag650.rowIndex,
              testData.fields.tag650.tag,
              testData.fields.tag650.ind1,
              testData.fields.tag650.ind2,
              testData.fields.tag650.controlled,
              testData.fields.tag650.eSubfield,
              testData.fields.tag650.zeroSubfield,
              testData.fields.tag650.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag651.rowIndex,
              testData.fields.tag651.tag,
              testData.fields.tag651.ind1,
              testData.fields.tag651.ind2,
              testData.fields.tag651.controlled,
              testData.fields.tag651.eSubfield,
              testData.fields.tag651.zeroSubfield,
              testData.fields.tag651.seventhBox,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.fields.tag655.rowIndex,
              testData.fields.tag655.tag,
              testData.fields.tag655.ind1,
              testData.fields.tag655.ind2,
              testData.fields.tag655.controlled,
              testData.fields.tag655.eSubfield,
              testData.fields.tag655.zeroSubfield,
              testData.fields.tag655.seventhBox,
            );
          },
        );
      });
    });
  });
});
