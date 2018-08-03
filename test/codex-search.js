/* global it describe */

const Nightmare = require('../xnightmare.js');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe('Load test-codexsearch', function runMain() {
  this.timeout(Number(config.test_timeout));

  const nightmare = new Nightmare(config.nightmare);
  const title = 'Bridget';
  // const pageLoadPeriod = 2000;
  const actionLoadPeriod = 222;
  const searchResultsTitleSelector = `#list-search div[role="gridcell"][title*="${title}"]`;
  const titleSortSelector = `#clickable-list-column-title`;
  const firstResultSelector = `#list-search div[role="listitem"] div[role="gridcell"][title]`;
  const resultCountSelector = `#paneHeaderpane-results-subtitle span`;
  const filterCheckBoxSelector = `#clickable-filter-type-Audio`;
  const resetButtonLabel = 'Reset all';
  const resetButtonSelector = '#clickable-reset-all';

  describe('Login > Codex Search > Confirm Results > *Sorting Results (Not working currently)* > Filtering Results > Reset Search > Confirm Reset > Logout\n', () => {
    it(`should login as ${config.username}/${config.password}`, (done) => {
      helpers.login(nightmare, config, done);
    });

    it('should open codex search and execute search', (done) => {
      nightmare
        .click('#clickable-search-module')
        .wait('#input-record-search')
        .type('#input-record-search', title)
        .wait(searchResultsTitleSelector)
        .then(done)
        .catch(done);
    });

    it('should confirm search results', (done) => {
      nightmare
        .wait(firstResultSelector)
        .evaluate(function csearch(selector, itemTitle) {
          const firstResult = document.querySelector(selector).title; // the entered title should be the first result
          if (firstResult.indexOf(itemTitle) === -1) {
            throw new Error(`Title not found in first position. Title found is (${firstResult})`);
          }
        }, firstResultSelector, title)
        .then((result) => { done(); })
        .catch(done);
    });


    /*
      This test is failing do to this functionality having regressed.
      https://issues.folio.org/browse/FOLIO-1149
    */

    // it('should sort results', (done) => {
    //   nightmare
    //     .evaluate(firstResultSelectorBeforeClick=>{
    //       let firstResult = document.querySelector(firstResultSelectorBeforeClick);
    //       return firstResult.title;
    //     }, firstResultSelector)
    //     .then((firstResultValueBeforeClick)=>{
    //       nightmare
    //         .click(titleSortSelector)
    //         .waitUntilNetworkIdle()
    //         .evaluate((firstResultSelectorAfterClick)=>{
    //           let firstResultAfterClick = document.querySelector(firstResultSelectorAfterClick);
    //           return firstResultAfterClick.title;
    //         }, firstResultSelector)
    //         .then(firstResultValueAfterClick=>{
    //           if(firstResultValueBeforeClick === firstResultValueAfterClick) {
    //             throw new Error(`Sort did not change ordering. ${firstResultValueBeforeClick} ${firstResultValueAfterClick}`);
    //           }
    //           done();
    //         })
    //         .catch(done);
    //     })
    //     .catch(done);
    // });

    /* NE, 2018-06-13:
       Disabled until further as it inexplicably fails on snapshot (and sometimes on testing iirc)
       I can at times reproduce it from home on the first try against a new snapshot build, but it usually
       passes in subsequent runs, making it all but impossible to experiment with it in one sitting.
       Will instead try with, like, one or two test runs per day, while tweaking test code and logging.
    it('should filter results', (done) => {

      nightmare
        .evaluate(resultSelectorBeforeClick => {
          const matchBeforClick = document.querySelector(resultSelectorBeforeClick);
          const countTextBeforeClick = matchBeforClick.innerText;
          return parseInt(countTextBeforeClick.substr(0, countTextBeforeClick.indexOf(' ')), 10);
        }, resultCountSelector)
        .then((resultCountBeforeClick) => {
          nightmare
            .click(filterCheckBoxSelector)
            .waitUntilNetworkIdle()
            .wait(1000)
            .evaluate((filterCheckBoxSelector, resultSelectorAfterClick) => {
              const filterCheckBox = document.querySelector(filterCheckBoxSelector);

              if (!filterCheckBox.checked) {
                throw new Error(`Filter not activated: filterCheckBox.checked = ${filterCheckBox.checked}`);
              }

              const matchAfterClick = document.querySelector(resultSelectorAfterClick);
              const countTextAfterClick = matchAfterClick.innerText;
              return parseInt(countTextAfterClick.substr(0, countTextAfterClick.indexOf(' ')), 10);
            }, filterCheckBoxSelector, resultCountSelector)
            .then(resultCountAfterClick => {
              if (resultCountBeforeClick <= resultCountAfterClick) {
                throw new Error(`Results were not reduced by filtering: resultCountBeforeClick: ${resultCountBeforeClick}, resultCountAfterClick: ${resultCountAfterClick}`);
              }
              done();
            })
            .catch(done);
        })
        .catch(done);
    });
    */

    it('should reset search', (done) => {
      nightmare
        .evaluate(function rsearch(resetLabel, resetSelector) {
          const matches = document.querySelectorAll(resetSelector);
          let found = false;
          if (matches.length === 0) {
            throw new Error('No buttons found');
          }
          matches.forEach(function codexClick(currentValue, currentIndex, listObj) {
            if (currentValue.textContent === resetLabel) {
              currentValue.click();
              found = true;
            }
          });
          if (!found) {
            throw new Error('Reset all button not found');
          }
        }, resetButtonLabel, resetButtonSelector)
        .then((result) => { done(); })
        .catch(done);
    });

    it('should confirm reset search', (done) => {
      // #input-record-search should be empty and Reset all disappears
      nightmare
        .wait(actionLoadPeriod)
        .evaluate(function confReset(selector) {
          const searchField = document.querySelector(selector);
          if (searchField.value.length > 0) {
            throw new Error('Input field not cleared on reset');
          }
        }, '#input-record-search')
        .evaluate(function confResetAgain(resetSelector) {
          const matches = document.querySelectorAll(resetSelector);
          matches.forEach(function confResetEach(currentValue, currentIndex, listObj) {
            if (!currentValue.disabled) {
              throw new Error('Reset all button is visible. '
                + 'Content: ' + currentValue.textContent
                + ' ID: ' + currentValue.id
                + ' Disabled: ' + currentValue.disabled);
            }
          });
        }, resetButtonSelector)
        .evaluate(function confResetOfFilters(resetSelector) {
          const filterCheckBox = document.querySelector(resetSelector);
          if(filterCheckBox.checked) {
            throw new Error('Filters have not been reset.');
          }
        }, filterCheckBoxSelector)
        .then((result) => { done(); })
        .catch(done);
    });

    it('should logout', (done) => {
      helpers.logout(nightmare, config, done);
    });
  });
});
