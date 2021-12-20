import uuid from 'uuid';

import {
  Accordion,
  Button,
  Checkbox,
  MultiColumnList,
  MultiSelect,
  SearchField,
  Selection,
  SelectionList,
} from '../../../../interactors';
import { testType } from '../../../support/utils/tagTools';

// TODO: refactoring needed in order to have 1-1 relation between smoke tests in Test Rail and TAF
describe('ui-finance: Funds list search and filter', () => {
  const timestamp = (new Date()).getTime();

  const fund = {
    id: uuid(),
    code: `E2ETFC${timestamp}`,
    fundStatus: 'Active',
    name: `E2E fund ${timestamp}`,
    description: `E2E fund description ${timestamp}`,
    externalAccountNo: `fund external  ${timestamp}`,
  };

  before(() => {
    cy.login('diku_admin', 'admin');

    cy.getToken('diku_admin', 'admin')
      .then(() => {
        cy.getFundTypesApi({ limit: 1 });
        cy.getTagsApi({ limit: 1 });
        cy.getAcqUnitsApi({ limit: 1 });
        cy.getLedgersApi({ limit: 1 });
        cy.getGroupsApi({ limit: 1 });
      })
      .then(() => {
        cy.visit('/finance/fund');
      });
  });

  beforeEach(() => {
    cy.createFundApi({
      ...fund,
      acqUnitIds: [Cypress.env('acqUnits')[0].id],
      ledgerId: Cypress.env('ledgers')[0].id,
      fundTypeId: Cypress.env('fundTypes')[0].id,
      tags: { tagList: [Cypress.env('tags')[0].label] },
      groupIds: [Cypress.env('groups')[0].id]
    });
  });

  afterEach(() => {
    cy.deleteFundApi(fund.id);

    cy.do([
      Button({ id: 'reset-funds-filters' }).click(),
    ]);
  });

  it('C4059 should return funds according to fund filters', { tags: [testType.smoke] }, function () {
    cy.do([
      Accordion({ id: 'ledgerId' }).clickHeader(),
      Selection({ id: 'ledgerId-selection' }).open(),
      SelectionList({ id: 'sl-container-ledgerId-selection' }).select(Cypress.env('ledgers')[0].name),

      Accordion({ id: 'fundStatus' }).clickHeader(),
      Checkbox({ id: 'clickable-filter-fundStatus-active' }).click(),

      Accordion({ id: 'fundTypeId' }).clickHeader(),
      Selection({ id: 'fundTypeId-selection' }).open(),
      SelectionList({ id: 'sl-container-fundTypeId-selection' }).select(Cypress.env('fundTypes')[0].name),

      Accordion({ id: 'groupFundFY.groupId' }).clickHeader(),
      Selection({ id: 'groupFundFY.groupId-selection' }).open(),
      SelectionList({ id: 'sl-container-groupFundFY.groupId-selection' }).select(Cypress.env('groups')[0].name),

      Accordion({ id: 'acqUnitIds' }).clickHeader(),
      Selection({ id: 'acqUnitIds-selection' }).open(),
      SelectionList({ id: 'sl-container-acqUnitIds-selection' }).select(Cypress.env('acqUnits')[0].name),

      Accordion({ id: 'tags' }).clickHeader(),
      MultiSelect({ id: 'acq-tags-filter' }).select([Cypress.env('tags')[0].label]),
    ]);

    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
  });

  it('C4059 should return funds according to search by name', { tags: [testType.smoke] }, () => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Name'),
      SearchField({ id: 'input-record-search' }).fillIn(fund.name),
      Button('Search').click(),
    ]);

    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
  });

  it('C4059 should return funds according to search by code', { tags: [testType.smoke] }, () => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Code'),
      SearchField({ id: 'input-record-search' }).fillIn(fund.code),
      Button('Search').click(),
    ]);

    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
  });

  it('C4059 should return funds according to search by external account number', { tags: [testType.smoke] }, () => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('External account number'),
      SearchField({ id: 'input-record-search' }).fillIn(fund.externalAccountNo),
      Button('Search').click(),
    ]);

    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
  });

  [
    ['Name', fund.name],
    ['Description', fund.description],
    ['Code', fund.code],
    ['External account number', fund.externalAccountNo],
  ].forEach(([key, value]) => {
    it(`C4059 should return funds according to search by All (${key})`, { tags: [testType.smoke] }, () => {
      cy.do([
        SearchField({ id: 'input-record-search' }).fillIn(value),
        Button('Search').click(),
      ]);

      cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
    });
  });
});
