﻿/// <reference path="../src/dependentObservable.js" />

describe('Dependent Observable', {
    'Should be subscribable': function () {
        var instance = new ko.dependentObservable(function () { });
        value_of(ko.isSubscribable(instance)).should_be(true);
    },

    'Should advertise that instances are observable': function () {
        var instance = new ko.dependentObservable(function () { });
        value_of(ko.isObservable(instance)).should_be(true);
    },

    'Should advertise that instances cannot have values written to them': function () {
        var instance = new ko.dependentObservable(function () { });
        value_of(ko.isWriteableObservable(instance)).should_be(false);
    },

    'Should require an evaluator function as constructor param': function () {
        var threw = false;
        try { var instance = new ko.dependentObservable(); }
        catch (ex) { threw = true; }
        value_of(threw).should_be(true);
    },

    'Should be able to read the current value of the evaluator function': function () {
        var instance = new ko.dependentObservable(function () { return 123; });
        value_of(instance()).should_be(123);
    },

    'Should not be able to write a value to it': function () {
        var instance = new ko.dependentObservable(function () { return 123; });

        var threw = false;
        try { instance(456); }
        catch (ex) { threw = true; }

        value_of(instance()).should_be(123);
        value_of(threw).should_be(true);
    },

    'Should cache result of evaluator function and not call it again until dependencies change': function () {
        var timesEvaluated = 0;
        var instance = new ko.dependentObservable(function () { timesEvaluated++; return 123; });
        value_of(instance()).should_be(123);
        value_of(instance()).should_be(123);
        value_of(timesEvaluated).should_be(1);
    },

    'Should automatically update value when a dependency changes': function () {
        var observable = new ko.observable(1);
        var depedentObservable = new ko.dependentObservable(function () { return observable() + 1; });
        value_of(depedentObservable()).should_be(2);

        observable(50);
        value_of(depedentObservable()).should_be(51);
    },

    'Should unsubscribe from previous dependencies each time a dependency changes': function () {
        var observableA = new ko.observable("A");
        var observableB = new ko.observable("B");
        var observableToUse = "A";
        var timesEvaluated = 0;
        var depedentObservable = new ko.dependentObservable(function () {
            timesEvaluated++;
            return observableToUse == "A" ? observableA() : observableB();
        });

        value_of(depedentObservable()).should_be("A");
        value_of(timesEvaluated).should_be(1);

        // Changing an unrelated observable doesn't trigger evaluation
        observableB("B2");
        value_of(timesEvaluated).should_be(1);

        // Switch to other observable
        observableToUse = "B";
        observableA("A2");
        value_of(depedentObservable()).should_be("B2");
        value_of(timesEvaluated).should_be(2);

        // Now changing the first observable doesn't trigger evaluation
        observableA("A3");
        value_of(timesEvaluated).should_be(2);
    },

    'Should notify subscribers of changes': function () {
        var notifiedValue;
        var observable = new ko.observable(1);
        var depedentObservable = new ko.dependentObservable(function () { return observable() + 1; });
        depedentObservable.subscribe(function (value) { notifiedValue = value; });

        value_of(notifiedValue).should_be(undefined);
        observable(2);
        value_of(notifiedValue).should_be(3);
    },

    'Should only update once when each dependency changes, even if evaluation calls the dependency multiple times': function () {
        var notifiedValues = [];
        var observable = new ko.observable();
        var depedentObservable = new ko.dependentObservable(function () { return observable() * observable(); });
        depedentObservable.subscribe(function (value) { notifiedValues.push(value); });
        observable(2);
        value_of(notifiedValues.length).should_be(1);
        value_of(notifiedValues[0]).should_be(4);
    },

    'Should be able to chain dependentObservables': function () {
        var underlyingObservable = new ko.observable(1);
        var dependent1 = new ko.dependentObservable(function () { return underlyingObservable() + 1; });
        var dependent2 = new ko.dependentObservable(function () { return dependent1() + 1; });
        value_of(dependent2()).should_be(3);

        underlyingObservable(11);
        value_of(dependent2()).should_be(13);
    },

    'Should accept "owner" parameter to define the object on which the evaluator function should be called': function () {
        var model = new (function () {
            this.greeting = "hello";
            this.fullMessageWithoutOwner = new ko.dependentObservable(function () { return this.greeting + " world" });
            this.fullMessageWithOwner = new ko.dependentObservable(function () { return this.greeting + " world" }, this);
        })();
        value_of(model.fullMessageWithoutOwner()).should_be("undefined world");
        value_of(model.fullMessageWithOwner()).should_be("hello world");
    },

    'Should dispose and not call its evaluator function when the disposeWhen function returns true': function () {
        var underlyingObservable = new ko.observable(100);
        var timeToDispose = false;
        var timesEvaluated = 0;
        var dependent = new ko.dependentObservable(
            function () { timesEvaluated++; return underlyingObservable() + 1; },
            null,
            { disposeWhen: function () { return timeToDispose; } }
        );
        value_of(timesEvaluated).should_be(1);
        value_of(dependent.getDependenciesCount()).should_be(1);

        timeToDispose = true;
        underlyingObservable(101);
        value_of(timesEvaluated).should_be(1);
        value_of(dependent.getDependenciesCount()).should_be(0);
    }
})