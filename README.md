# redux-indexers
A set of functions for producing and dealing with indexes in a referentially safe way!  Best with redux and similar non-mutative state modeling.

## What does redux-indexers do?

Basically, it keeps data "in order".  Like a database index.  You can define multi-level indexes and use any computation you want to determine the sorting values.
It's also referentially safe -- all modifications to the index produce shallowly copied data.

## Why not just .sort()?

`.sort()` works great for sorting a big set of data once.  But suppose you're keeping the same set of data ordered in multiple ways, such as by date created, by name, by id, by it's group_id, etc, etc.  And suppose you're going to be adding and removing data constantly.  

This can get surprisingly expensive to execute over and over when your list size gets to a thousand or more entries.

redux-indexers has *decent* performance for loading big sets of data in, but it really shines best when several, small incremental data sets are loaded in over a long time, such as paging over a JSON Api or receiving big sets of data over a websocket.

It also provides some pretty convenient query utilities, allowing you to easily search, slice, and iter based on even multi-leveled key data.

Plus, it's small.  And simple.  Combine it with your redux stores to create smart little client side databases in no time!

# Usage

Suppose we have an object representing a single chat message.

```typescript
interface ChatMessage {
  id: number
  text: string
  roomId: string
  userId: string
  createdAt: number
}
```

We might want to keep a collection of chat messages sorted in various ways:
* By id, so we can find a specific chat message quickly.
* By userId and createdAt, so we can produce a list of messages in order of creation per user.
* By roomId, createdAt, and id, so we can produce a list of messages in order of creation per room, and break ties on createdAt with the id.

We'll keep each of these different 'orderings' as separate lists in a containing object.

```typescript
interface ChatMessageIndexes {
  byId: Index<ChatMessage>,
  byUserIdAndCreatedAt: Index<ChatMessage>,
  byRoomIdCreatedAtAndId: Index<ChatMessage>,
}
```

To be clear, you can name these properties whatever you want!  `redux-indexer` makes no assumptions about the names of your properties.

Which, speaking of, we now create a 'indexer' object that will define how each of these properties should order the data.

```typescript
let indexer = new Indexer<ChatMessage>("byId");
```

The `"byId"` argument tells our indexer which index is the "primary" index.  When updating a value in our indexes, that value is first looked up in the primary index to determine
if it should replace some previous, existing value, or add it is a unique, new value. 

But so far, we haven't told `redux-indexers` what each of our indexes is actually ordering.  We define that by simply associating a function to each of the index property names.

```typescript
indexer.addIndex("byId", m => [m.id]);
indexer.addIndex("byUserIdAndCreatedAt", m => [m.userId, m.createdAt]);
indexer.addIndex("byRoomIdCreatedAtAndId", m => [m.roomId, m.createdAt, m.id]);
```

Notice that we return arrays for our values to index; all keys are multi-level.  This works much like multi-column indexes in a standard database, sorting first by elements near the head of the key array,  followed by subsorting on each successively further element.

**It's important to note that redux-indexer uses Javascript comparison operators to sort each individual element.**  As a result, it is best to index on numbers, strings, null / undefined, and Infinity only.  This covers most cases pretty effectively in practice.  For instance, you can sort on Data values by simply calling `.getTime()`.

As an idea for how ordering works, check out this reference:

```
[2] < [2, null]
[3] > [2, null]

[2, null] < [2, "a"]
[2, "a", null] > [2, "a"]
[2, "a", null] < [2, "b"]

[3] < [4]
[Infinity] > [9999999, 9999999, 999999, "a"]
```

Now, let's actually create some redux state!  Indexer objects themselves do not actually store any state -- they merely contain the logic for managing a group of indexes.  But, the indexer provides a handy method to get our initial, empty state!

```typescript
let indexes = indexer.empty();
```

Now let's add some data!

```typescript
indexes = indexer.update(indexes, [
  { id: 1, text: "Hello! 1", roomId: "room-1", userId: "user-1", createdAt: 400},
  { id: 2, text: "Hello! 2", roomId: "room-2", userId: "user-2", createdAt: 200},
  { id: 3, text: "Hello! 3", roomId: "room-2", userId: "user-1", createdAt: 700},
  { id: 4, text: "Hello! 4", roomId: "room-1", userId: "user-2", createdAt: 800}
]);
```

Note that indexes itself was not modified, but shallowly copied to reflect the new lists.  This is the sauce that makes it nice for redux.

But once we put in data, we want to get it back out.  How?

```typescript
let messages = Indexer.getAllMatching(indexes.byRoomIdCreatedAtAndId, ["room-2"]);
```

Now we've got all the messages in room-2, in order of their createdAt and id!  Not bad!  Next, if we were to update the values again, our ordering would be updated as well.

```typescript
indexes = indexer.update(indexes, [
  { id: 1, text: "Hello! 1", roomId: "room-2", userId: "user-1", createdAt: 400},
  { id: 2, text: "Hello! 2", roomId: "room-1", userId: "user-2", createdAt: 200},
]);
```

Because we defined our primary index to byId, the update will detect the existing values matching id 1 and 2, and replace their entries in each index with the new values.

By the way, we can also get all our messages out, in order by first user, then createdAt, by using the appropriate index, and providing an empty matching key.

```typescript
let messages = Indexer.getAllMatching(indexes.byUserIdAndCreatedAt, []);
```


Checkout the index.ts file for more query / modification functions!
