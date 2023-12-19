import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Create a new list', () => {
  const userData = {};
  const listData = {
    name: getTestEntityValue('test_list'),
    recordType: 'Users',
    status: ['Active', 'Inactive'],
    visibility: 'Private',
  };

  before('Create a user', () => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
      userData.username = userProperties.username;
      userData.password = userProperties.password;
      userData.userId = userProperties.userId;
    });
  });

  after('Delete a user', () => {
    cy.getUserToken(userData.username, userData.password);
    Lists.getViaApi().then((response) => {
      const filteredItem = response.body.content.find((item) => item.name === listData.name);
      Lists.deleteViaApi(filteredItem.id);
    });
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it('C411822  Refresh list: Inactive lists', { tags: ['smoke', 'corsair'] }, () => {
    cy.login(userData.username, userData.password);
    cy.visit(TopMenu.listsPath);
    Lists.waitLoading();
    Lists.openNewListPane();
    Lists.setName(listData.name);
    Lists.setDescription(listData.name);
    Lists.selectRecordType(listData.recordType);
    Lists.selectVisibility(listData.visibility);
    Lists.selectStatus(listData.status[1]);
    Lists.buildQuery();
    cy.get('#field-option-0').click();
    cy.contains('User active').click();
    cy.get('[data-testid="operator-option-0"]').select('==');
    cy.get('[data-testid="data-input-select-boolType"]').select('True');
    cy.get('button:contains("Test query")').click();
    cy.wait(7000);
    cy.get('button:contains("Run query & save")').click();
    Lists.actionButton();
    cy.contains('Refresh list').should('be.disabled');
  });

  it(
    "C411823 Refresh list: The list doesn't contain query",
    { tags: ['criticalPath', 'corsair'] },
    () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType(listData.recordType);
      Lists.selectVisibility(listData.visibility);
      Lists.selectStatus(listData.status[1]);
      Lists.saveList();
      Lists.actionButton();
      cy.contains('Refresh list').should('be.disabled');
    },
  );

  it('C411824 Refresh list: Edit is in progress', { tags: ['criticalPath', 'corsair'] }, () => {
    cy.login(userData.username, userData.password);
    cy.visit(TopMenu.listsPath);
    Lists.waitLoading();
    Lists.openNewListPane();
    Lists.setName(listData.name);
    Lists.setDescription(listData.name);
    Lists.selectRecordType(listData.recordType);
    Lists.selectVisibility(listData.visibility);
    Lists.selectStatus(listData.status[0]);
    Lists.saveList();
    Lists.actionButton();
    Lists.editList();
    Lists.actionButton();
    cy.contains('Refresh list').should('not.exist');
  });

  it('C411833 Refresh list: Export is in progress', { tags: ['criticalPath', 'corsair'] }, () => {
    cy.login(userData.username, userData.password);
    cy.visit(TopMenu.listsPath);
    Lists.waitLoading();
    Lists.openNewListPane();
    Lists.setName(listData.name);
    Lists.setDescription(listData.name);
    Lists.selectRecordType(listData.recordType);
    Lists.selectVisibility(listData.visibility);
    Lists.selectStatus(listData.status[0]);
    Lists.buildQuery();
    cy.get('#field-option-0').click();
    cy.contains('User active').click();
    cy.get('[data-testid="operator-option-0"]').select('==');
    cy.get('[data-testid="data-input-select-boolType"]').select('True');
    cy.get('button:contains("Test query")').click();
    cy.wait(4000);
    cy.get('button:contains("Run query & save")').click();
    cy.wait(17000);
    cy.contains('View updated list').click();
    Lists.actionButton();
    cy.contains('Export list').click();
    Lists.actionButton();
    cy.contains('Refresh list').should('be.disabled');
  });

  it(
    'C411834 Refresh list: Cancel Refresh - less than 500 records',
    { tags: ['criticalPath', 'corsair'] },
    () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType(listData.recordType);
      Lists.selectVisibility(listData.visibility);
      Lists.selectStatus(listData.status[0]);
      Lists.buildQuery();
      cy.get('#field-option-0').click();
      cy.contains('User active').click();
      cy.get('[data-testid="operator-option-0"]').select('==');
      cy.get('[data-testid="data-input-select-boolType"]').select('True');
      cy.get('button:contains("Test query")').click();
      cy.wait(4000);
      cy.get('button:contains("Run query & save")').click();
      Lists.actionButton();
      Lists.cancelRefresh();
      cy.contains(`The refresh for ${listData.name} was successfully cancelled.`);
    },
  );

  it(
    'C411834 Refresh list: Cancel Refresh - more than 500 records',
    { tags: ['criticalPath', 'corsair'] },
    () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType(listData.recordType);
      Lists.selectVisibility(listData.visibility);
      Lists.selectStatus(listData.status[0]);
      Lists.buildQuery();
      cy.get('#field-option-0').click();
      cy.contains('User active').click();
      cy.get('[data-testid="operator-option-0"]').select('==');
      cy.get('[data-testid="data-input-select-boolType"]').select('True');
      cy.get('button:contains("Test query")').click();
      cy.wait(7000);
      cy.get('button:contains("Run query & save")').click();
      cy.wait(9000);
      Lists.actionButton();
      Lists.cancelRefresh();
      cy.contains(
        `Error: the refresh for ${listData.name} was not cancelled. Verify a refresh is in progress and try again`,
      );
    },
  );
});
