import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';

describe('eHoldings', () => {
  describe('Titles', () => {
    const testData = {
      title: 'Journal of lipid research',
      titleId: '41327',
      publicationType: 'Journal',
      peerReviewed: 'Yes',
      titleType: 'Managed',
    };

    before('Creating user and getting info about title', () => {
      cy.createTempUser([
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      ]).then((userProperties) => {
        testData.userProperties = userProperties;
      });
      cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
        testData.C9240UserProperties = userProperties;
      });
      // by id: the KB has more than one title with this name, and only this one has subjects
      EHoldingsTitles.getTitleByIdViaApi(testData.titleId).then(({ body: { data } }) => {
        testData.alternateTitles = data.attributes.alternateTitles
          .map((el) => el.alternateTitle)
          .join('; ');
        testData.ISSNPrint = data.attributes.identifiers.filter(
          (el) => el.type === 'ISSN' && el.subtype === 'Print',
        )[0].id;
        testData.ISSNOnline = data.attributes.identifiers.filter(
          (el) => el.type === 'ISSN' && el.subtype === 'Online',
        )[0].id;
        testData.publisher = data.attributes.publisherName;
        testData.subjects = data.attributes.subjects[0].subject;
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C360543 Check the content of "Title information" accordion in "Title" detail record (promin)',
      { tags: ['extendedPath', 'promin', 'C360543'] },
      () => {
        cy.login(testData.C9240UserProperties.username, testData.C9240UserProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });

        cy.visit(`${TopMenu.eholdingsPath}/titles/${testData.titleId}`);
        EHoldingsTitle.waitLoading(testData.title);
        EHoldingsTitle.checkTitleInformationField('Alternate title(s)', testData.alternateTitles);
        EHoldingsTitle.checkTitleInformationField('Publication type', testData.publicationType);
        EHoldingsTitle.checkTitleInformationField('ISSN (Print)', testData.ISSNPrint);
        EHoldingsTitle.checkTitleInformationField('ISSN (Online)', testData.ISSNOnline);
        EHoldingsTitle.checkTitleInformationField('Publisher', testData.publisher);
        EHoldingsTitle.checkTitleInformationField('Subjects', testData.subjects);
        EHoldingsTitle.checkTitleInformationField('Peer reviewed', testData.peerReviewed);
        EHoldingsTitle.checkTitleInformationField('Title type', testData.titleType);
      },
    );
  });
});
