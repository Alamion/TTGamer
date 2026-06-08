# Modifiers

Modifiers are special flags that can change the value of dice rolls, their appearance, order, and more.

You can generally combine multiple modifiers of different types, and they'll work together.

For example, This will both [Explode](#exploding) any maximum rolls, and [Keep](#keep) only the highest 2 rolls:

```
5d10!k2
```

::: tip Missing a modifier?
We have tried to cover all the commonly used modifiers. [Let us know](https://github.com/dice-roller/rpg-dice-roller/issues) if we've missed one that you use!
:::

::: warning Modifier order
Modifiers always run in a specific order, regardless of the order you specify them in the notation.
This is determined by the modifier's `order` property, and works in ascending order.

These two are equivalent and, by default, the [explode modifier](#exploding) will always run before the [drop modifier](#drop):

```
4d6!d1
4d6d1!
```

You can change the modifier execution order.
:::

## Min

**Notation:** `min{n}`

**Order:** 1

The min modifier causes any dice rolls below the minimum value to be treated as the minimum value. It's the opposite of the [Max modifier](#max)

To specify a minimum value, use the word `min` followed by the minimum value: `4d6min3`

For example:

```
// a normal roll
4d6: [1, 4, 3, 2] = 10

// the same roll but values less than 3 are treated as 3
4d6min3: [3^, 4, 3, 3^] = 13
```

::: roller 4d6min3 :::

::: tip Statistic probability
It's worth noting that it is statistically more likely to roll the minimum value than any others.

e.g. `d6min3` 4, 5, and 6 only have a _1 in 6 (16.66%)_ chance of being rolled, but 3 has a _3 in 6 (50%)_ chance.
:::

## Max

**Notation:** `max{n}`

**Order:** 2

The max modifier causes any dice rolls above the maximum value to be treated as the maximum value. It's the opposite of the [Min modifier](#min)

To specify a maximum value, use the word `max` followed by the maximum value: `4d6max3`

For example:

```
// a normal roll
4d6: [5, 4, 3, 2] = 14

// the same roll but values greater than 3 are treated as 3
4d6max3: [3v, 3v, 3, 2] = 11
```

::: roller 4d6max3 :::

::: tip Statistic probability
It's worth noting that it is statistically more likely to roll the maximum value than any others.

e.g. `d6max3` 1 and 2 only have a _1 in 6 (16.66%)_ chance of being rolled, but 3 has a _4 in 6 (66.66%)_ chance.
:::

## Exploding

**Notation:** `!` / `!{cp}`

**Order:** 3

The exploding dice mechanic allows one or more dice to be re-rolled (Usually when it rolls the highest possible number on the die), with each successive roll being added to the total.

To explode a die, add an exclamation mark after the die notation: `4d10!`

Each exploded die shows as a separate roll in the list, like so:

```
2d6!: [4, 6!, 6!, 2] = 18
```

The second die rolled the highest value, and so it exploded - we roll again. The re-rolled die also exploded, so we roll a fourth time. The fourth roll, however, did not explode, so we stop rolling.

If you want to change the number that a die will explode on, you can use a [Compare Point](#compare-point):

```
2d6!=5   // explode on any rolls equal to 5
2d6!>4   // explode on any rolls greater than 4
4d10!<=3 // explode on any roll less than or equal to 3
```

Read more about [Compare Points below](#compare-point).

::: roller 4d10!<=3 :::

::: warning `!=` (Not equal) compare point with exploding dice
If you want a die that only explodes on a specific value, the `!=` (Not equal) operator will **not** work here, and you must use the alternative ["not equal to" operator](#not-equal-to) instead, `<>`:

```
// Wrong! Creates a compound roll if you roll a 4.
2d6!!=4

// Correct!
2d6!<>4
```

:::

::: tip Iteration limit
To stop infinite loops, when running something like `d10!>0`, modifiers are limited to 1000 iterations per dice roll:

- `1d10!>0` would return 1001 rolls; the initial roll, and 1000 exploded rolls.
- `2d10!>0` would return 2002 rolls; the initial 2 rolls, and 100 exploded rolls per initial roll.

This also applies to [Compounding](#compounding), [Penetrating](#penetrating), [Re-roll](#re-roll), and [Unique](#unique) modifiers.
:::

### Compounding

**Notation:** `!!` / `!!{cp}`

Sometimes, you may want the exploded dice rolls to be combined into a single roll. In this situation, you can compound the dice by using two exclamation marks: `4d10!!`

For example:

```
// exploding re-rolls the dice
2d6!: [4, 6!, 6!, 2] = 18

// compounding combines the re-rolled dice
2d6!!: [4, 14!!] = 18
```

You can also use [Compare Points](#compare-point) to change when a die will compound:

```
2d6!!=5   // compound on any rolls equal to 5
2d6!!>4   // compound on any rolls greater than 4
4d10!!<=3 // compound on any roll less than or equal to 3
```

::: roller 4d10!!<=3 :::

### Penetrating

**Notation:** `!p` / `!!p` / `!p{cp}` / `!!p{cp}`

Some exploding dice system use a penetrating rule.

Taken from the HackMaster Basic rules:

> Should you roll the maximum value
> on this particular die, you may re-roll and add the result of
> the extra die, less one point, to the total (penetration can
> actually result in simply the maximum die value if a 1 is subsequently
> rolled, since any fool knows that 1-1=0). This
> process continues indefinitely as long as the die in question
> continues to come up maximum (but there’s always only a
> –1 subtracted from the extra die, even if it’s, say, the third
> die of penetration)

So, if I rolled `1d6` (penetrating), and got a 6, I would roll another `d6`, subtracting 1 from the result. If that die rolled a 6 (before the -1) it would also penetrate, and so on.

The syntax for penetrating is very similar to exploding, but with a lowercase 'p' appended: `2d6!p`.

For example:

```
// Actual rolls are [6, 6, 6, 4, 1]
2d6!p: [6!p, 5!p, 5!p, 3, 1] = 20
```

The first roll exploded (Rolled the highest number on the die), so we rolled again and subtracted 1 from the re-roll. The second and third rolls also exploded and were re-rolled, so we subtract 1 from each.

Remember that we subtract 1 from penetrated rolls, which is why we see `5`, `5`, `3` instead of `6`, `6`, `4`.

You can also compound penetrating dice, like so: `2d6!!p`

You can also use [Compare Points](#compare-point) to change when a die will penetrate:

```
2d6!p=5   // penetrate on any rolls equal to 5
2d6!!p>4  // penetrate and compound on any rolls greater than 4
4d10!p<=3 // penetrate on any roll less than or equal to 3
```

::: roller 4d10!p<=3 :::

## Re-roll

**Notation:** `r` / `ro` / `r{cp}` / `ro{cp}`

**Order:** 4

This will re-roll a die that rolls the lowest possible number on a die (Usually a 1). It will keep re-rolling until a number greater than the minimum is rolled, disregarding any of the previous rolls.

This is similar to [Exploding](#exploding), but explode will keep the previous rolls and add them together.

To re-roll, add an `r` after the dice notation:

```
// roll 1 d6 and re-roll if the result is 1 (and again each time a 1 is rolled)
d6r;
```

If you only want to re-roll once, even if the second roll also rolls the minimum value, you can use the `ro` notation:

```
// roll 1 d6 and re-roll if the result is 1. Don't re-roll again, even if the second roll is also a 1
d6ro;
```

If you want to change the number that a die will re-roll on, you can use a [Compare Point](#compare-point):

```
2d6r=5    // re-roll on any rolls equal to 5
2d6ro>4   // re-roll once on any roll greater than 4
4d10r<=3  // re-roll on any roll less than or equal to 3
```

Read more about [Compare Points below](#compare-point).

::: roller 4d10r<=3 :::

::: tip Iteration limit
To stop infinite loops, when running something like `d10r>0`, modifiers are limited to 1000 iterations per dice roll:

- `1d10r>0`would only re-roll 1000 times.
- `2d10r>0` would re-roll 2000; 1000 for each initial roll.

This also applies to [Exploding](#exploding), [Compounding](#compounding), [Penetrating](#penetrating), and [Unique](#unique) modifiers.
:::

## Unique

**Notation:** `u` / `uo` / `u{cp}` / `uo{cp}`

**Order:** 5

The unique modifier wil re-roll any dice where the value is not unique. It will keep rolling until a unique value is rolled, disregarding any of the previous rolls.

You can keep rolls unique by adding a `u` after the die notation:

```
// re-roll any duplicate rolls and keep re-rolling until they are unique
2d10u
```

If you only want to roll a duplicate die once, the use `uo`:

```
// re-roll any duplicates but only once, even if the re-roll is not unique
2d10uo
```

This could end up with duplicates, if the re-roll also rolls a duplicate.

If you only want to re-roll duplicates if they match certain criteria (i.e. below a certain threshold, or equal a certain value), you can use a [Compare Point](#compare-point):

```
4d6u=5    // Only re-roll duplicates that roll a 5
3d8ro>6   // Re-roll duplicates once on any roll greater than 6
10d4u<=2  // Re-roll any duplicates less than or equal to 2
```

Read more about [Compare Points below](#compare-point).

::: roller 5d4u :::

::: tip Iteration limit
When using the unique modifier on a die set that has more rolls than the number of sides on the die, it is impossible for all the rolls to be unique.

For example, `5d3u` will produce more results than possible unique values, and could result in an infinite re-roll loop.

To stop infinite loops, modifiers are limited to 1000 iterations per dice roll:

- `5d3u` would only re-roll a maximum of 4000 times; 1000 for each initial roll (excluding the first).

This also applies to [Exploding](#exploding), [Compounding](#compounding), [Penetrating](#penetrating), and [Re-roll](#re-roll) modifiers.
:::

## Keep

**Notation:** `k{n}` / `kh{n}` / `kl{n}`

**Order:** 6

The keep modifier allows you to roll a collection of dice but to disregard all except for the highest or lowest result(s).
It is the opposite of the [Drop modifier](#drop).

The notation of the keep modifier is a lowercase `k`, followed by the end that should be dropped ("h" = "highest", "l" = "lowest"), and the number of dice to drop.

The "end" is optional and, if omitted, will default to _highest_.

For example:

```
4d10kh2 // roll a d10 4 times and keep the highest 2 rolls
4d10k2  // equivalent to the above
4d10kl1 // roll a d10 4 times and keep the lowest roll
```

When outputting the roll, the kept rolls aren't modified, but the dropped rolls are given the "d" flag:

```
6d8k3: [3d, 6, 7, 2d, 5, 4d] = 18
```

::: roller 6d8k3 :::

::: tip Using Drop and Keep modifiers together
The keep and [drop](#drop) modifiers work really well together, but there are some caveats.
They both look at the entire dice pool. So if a roll has been dropped, it will be still be included in the list of possible rolls to drop.

This means that using keep and drop modifiers together can override each other.

For example, the following will drop all the rolls:

```
3d10k1dh1: [7d, 1d, 2d] = 0
```

The is because the `k1` will drop the `1` and `2`, and the `dh1` will drop the `7`.

This (perhaps more expectedly) will only keep the highest dice:

```
3d10k1d1: [6d, 1d, 9] = 9
```

The `k1` will drop the `6` and `1`, and the `d1` will also drop the `6`.
:::

## Drop

**Notation:** `d{n}` / `dh{n}` / `dl{n}`

**Order:** 7

Sometimes you may want to roll a certain number of dice, but "drop" or remove high or low rolls from the results.
It is the opposite of the [Keep modifier](#keep).

The notation of the drop modifier is a lowercase `d`, followed by the end that should be dropped (`h` = "highest", `l` = "lowest"), and the number of dice to drop.

The "end" is optional and, if omitted, will default to _lowest_.

For example:

```
4d10dl2    // roll a d10 4 times and drop the lowest 2 rolls
4d10d2     // equivalent to the above
4d10dh1    // roll a d10 4 times and drop the highest roll
```

When outputting the roll, the dropped rolls are given the "d" flag:

```
6d8dh3: [3, 6d, 7d, 2, 5d, 4] = 9
```

You can also use "drop lowest" and "drop highest" modifiers together:

```
// roll a d10 4 times and drop the highest and lowest rolls
4d10dh1dl2: [5, 3d, 7, 8d] = 12
```

::: roller 4d10dh1dl2 :::

::: tip Using Drop and Keep modifiers together
See the note in the [Keep modifier section](#keep) regarding using the two together
:::

## Target success / Dice pool

**Notation:** `{cp}`

**Order:** 8

Some systems use dice pool, or success counts, whereby the total is equal to the quantity of dice rolled that meet a fixed condition, rather than the total value of the rolls.

This can be achieved by adding a [Compare Point](#compare-point) notation directly after the die notation.

For example; a "pool" of 10 sided dice where you count the number of dice that roll an 8, or higher, as "successes":

```
5d10>=8
```

You can use any valid [Compare Point](#compare-point) notation.

Examples:

```
2d6=6: [4, 6*] = 1                   // only a roll of 6 is a success
4d3>1: [1, 3*, 2*, 1] = 2            // greater than a 1 is a success
4d3<2: [1*, 3, 2, 1*] = 2            // less than a 2 is a success
5d8>=5: [2, 4, 6*, 3, 8*] = 2        // greater than or equal to 5 is a success
6d10<=4: [7, 2*, 10, 3*, 3*, 4*] = 4 // less than or equal to 4 is a success
```

::: warning `!=` (Not equal) compare point with exploding dice
If you want to count success for any number that is _not_ equal to a specific value, the `!=` (Not equal) operator will **not** work here, and you must use the alternative ["not equal to" operator](#not-equal-to) instead, `<>`:

```
// Wrong! Creates an exploding roll if you roll a 4.
2d6!=4

// Correct!
2d6<>4
```

:::

::: warning Modifiers with compare points
The target modifier cannot directly follow any modifier that uses [Compare Points](#compare-point),
otherwise the Target modifier will be instead be used as the [Compare Point](#compare-point) for the modifier:

```
2d6!>3   // explode on any roll greater than 3
```

You can work around this by specifying the Target compare point first:

```
2d6>3!   // explode on a roll of 6, greater than 3 is a success
2d6>3!<4 // explode on any roll less than 4, greater than 3 is a success
```

:::

::: roller 6d10<=4 :::

## Target failure / Dice pool

**Notation:** `f{cp}`

**Order:** 8

Sometimes, when counting success, you also need to consider failures.

A failure modifier _must_ directly follow a Success modifier, and works in much the same way.

For each failure counted, it will _subtract 1_ from the total number of successes counted.

The Failure modifier is a [Compare Point](#compare-point), preceded with the lowercase letter "f":

```
// greater than 4 is success, less than 3 is failure
4d6>4f<3: [2_, 5*, 4, 5*] = 1
```

::: roller 4d6>4f<3 :::

## Critical success

**Notation:** `cs` / `cs{cp}`

**Order:** 9

::: tip
This is purely aesthetic and makes no functional difference to the rolls or their values.
:::

Typically, when a die rolls the highest possible value, such as rolling a `20` on a d20, this is called a critical success.

You can highlight a critical success roll by adding `cs` after the die notation: `2d20cs`

Critical success rolls will be marked with a double asterisk:

```
2d20cs: [4, 20**] = 24
```

However, sometimes you want a critical success to be on a different value, or a range.

To specify what is considered as a critical success, use a [Compare Point](#compare-point):

```
// rolls greater than 7 are a critical success
4d10cs>7
// rolls equal to 2 is a critical success
5d3cs=2
```

::: roller 5d20cs>=16 :::

## Critical Failure

**Notation:** `cf` / `cf{cp}`

**Order:** 10

::: tip
This is purely aesthetic and makes no functional difference to the rolls or their values.
:::

Typically, when a die rolls the lowest possible value, such as rolling a `1` on a d20, this is called a critical failure.

You can highlight a critical failure roll by adding `cf` after the die notation: `2d20cf`

Critical success rolls will be marked with a double underscore:

```
2d20cf: [4, 1__] = 5
```

However, sometimes you want a critical failure to be on a different value, or a range.

To specify what is considered as a critical failure, use a [Compare Point](#compare-point):

```
// rolls less than 3 is a critical failure
4d10cf<3
// rolls equal to 2 is a critical failure
6d4cf=2
```

::: roller 5d20cf<=6 :::

## Sorting

**Notation:** `s` / `sa` / `sd`

**Order:** 11

You can sort the dice rolls, so that they are displayed in numerical order by appending the `s` flag after the dice notation.

The default order is ascending, but you can specify the sort order using `sa` and `sd` for ascending and descending respectively:

```
4d6: [4, 3, 5, 1]   // no sorting
4d6s: [1, 3, 4, 5]  // default sort the results ascending
4d6sa: [1, 3, 4, 5] // sort the results ascending
4d6sd: [5, 4, 3, 1] // sort the results descending
```

::: roller 4d6sd :::

## Compare point

Many modifiers perform an action when the die rolls either the highest or lowest possible number. Sometimes you may want the modifier to execute on different values, and this is what Compare Points are for.

A compare point is a comparative operator, followed by the number to match against (e.g. `=8`)

The following are valid comparative operators:

```
=   // equal to
!=  // not equal to
<>  // Also not equal to
<   // less than
>   // greater than
<=  // less than or equal to
>=  // greater than or equal to
```

Wherever you can use compare points, the notation is the same. So if you wanted to check if a number is _"greater than or equal to 5"_, the notation would look like:

```
>=5
```

Here are some examples with full notation strings:

```
d6!=3    // roll a d6 and explode any roll equal to 3
d10!>=5  // roll a d10 and explode on any roll greater than or equal to 5
d6!!>4   // roll a d6 and compound only on rolls greater than 4
d6!<>4   // roll a d6 and explode on any roll not equal to 4
d4r<3    // roll a d4 and re-roll anything less than 3
```

::: roller d4r<3 :::

### Not equal to

**Notation:** `!=` | `<>`

There are two different operators for "not equal to"; `!=` and `<>`.

These operators both function exactly the same, and are interchangeable.
Typically, throughout the documentation, you'll see the former used for consistency.

The second form `<>` was introduced as a way of being able to use "not equal" checks in combination with exploding dice.

::: tip Example
If we wanted to explode any dice that do **not** roll a `4`.

This will not work, and will instead create a [compound roll](#compounding) if you roll a `4`:

```
2d6!!=4
```

This will correctly explode if the value is _not_ `4`:

```
2d6!<>4
```

:::
