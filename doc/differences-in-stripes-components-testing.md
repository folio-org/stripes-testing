# Differences in `stripes-components` testing

<!-- md2toc -l 2 differences-in-stripes-components-testing.md -->
* [Waiting on elements instead of delays](#waiting-on-elements-instead-of-delays)
* [Using `@bigtest/mocha` instead of regular Mocha](#using-bigtestmocha-instead-of-regular-mocha)
* [Using `@bigtest/interactors` to provide short-cuts](#using-bigtestinteractors-to-provide-short-cuts)
* [Using Karma instead of Nightmare](#using-karma-instead-of-nightmare)
* [Starting tests with `stripes test`](#starting-tests-with-stripes-test)


The tests for the `stripes-components` library currently differ in several ways from those of the Stripes applications (`ui-users`, etc.) It turns out that these are all orthogonal and can be considered in isolation. We should decide, for each of them, whether to retrofit to the application tests.

This discussion paper is the outcome of an informal break-out meeting on the afternoon of Tuesday 8 May 2018, with Mike Taylor, John Coburn, Matt Jones and Zak Burke.


## Waiting on elements instead of delays

The application tests are full of sequences like the following (from [`ui-users/test/ui-testing/new_proxy.js`](https://github.com/folio-org/ui-users/blob/bd97d96a23012ef1c9ab3cb14b1f55a97f395c2f/test/ui-testing/new_proxy.js#L28-L30)):

	.click('#clickable-users-module')
	.wait(1000)
	.click('#clickable-filter-active-Active')

This waits for a fixed period of 1000 ms for the results of the first click to take place before attempting the second click, which is both slow and unreliable: it will fail if, for some reason, it takes more than a second for the click to take effect.

Instead, the stripes-component tests wait for the required element to become available:

	.click('#clickable-users-module')
	.wait('#clickable-filter-active-Active')
	.click('#clickable-filter-active-Active')

There is no reason why the application tests should not be using this form, in at least most cases. (There may be some specific difficult cases where timed delays are necessary; these should be considered on their merits.)


## Using `@bigtest/mocha` instead of regular Mocha

[`@bigtestjs/mocha`](https://github.com/bigtestjs/mocha) is Frontside's derivative of the standard Mocha test-running library. It differs from the parent package in repeatedly polling each test until it becomes true, or until an implicit timeout expires. (They call this approach "convergent assertion").

On the positive side, this allows `.wait` actions to be omitted altogether. On the negative side, it introduces some surprises if any test inadvertently contains anything that changes state, as that state-change will be executed an indeterminate number of times.

I'm not convinced that the unpredictable cost of this approach is necessarily worth the gain. We can consider whether to shift to using `@bigtest/mocha`, but it's not an obvious move.


## Using `@bigtest/interactors` to provide short-cuts

## Using Karma instead of Nightmare

## Starting tests with `stripes test`

