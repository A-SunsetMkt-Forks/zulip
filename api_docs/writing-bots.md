# Writing interactive bots

This guide is about writing and testing interactive bots. We assume
familiarity with our [guide for running bots](running-bots).

On this page you'll find:

* A step-by-step
  [guide](#installing-a-development-version-of-the-zulip-bots-package)
  on how to set up a development environment for writing bots with all
  of our nice tooling to make it easy to write and test your work.
* A [guide](#writing-a-bot) on writing a bot.
* A [guide](#adding-a-bot-to-zulip) on adding a bot to Zulip.
* A [guide](#testing-a-bots-output) on testing a bot's output.
* [Documentation](#bot-api) of the bot API.
* Common [problems](#common-problems) when developing/running bots and their solutions.

## Installing a development version of the Zulip bots package

{start_tabs}

1. Clone the [python-zulip-api](https://github.com/zulip/python-zulip-api)
   repository:

    ```
    git clone https://github.com/zulip/python-zulip-api.git
    ```

1. Navigate into your cloned repository:

    ```
    cd python-zulip-api
    ```

1. Install all requirements in a Python virtualenv:

    ```
    python3 ./tools/provision
    ```

1. Run the command provided in the final output of the `provision` process to
   enter the new virtualenv. The command will be of the form `source .../activate`.

1. You should now see the name of your virtualenv preceding your prompt (e.g.,
   `(zulip-api-py3-venv)`).

!!! tip ""

    `provision` installs the `zulip`, `zulip_bots`, and
    `zulip_botserver` packages in developer mode. This enables you to
    modify these packages and then run your modified code without
    having to first re-install the packages or re-provision.

{end_tabs}

## Writing a bot

The tutorial below explains the structure of a bot `<my-bot>.py`,
which is the only file you need to create for a new bot. You
can use this as boilerplate code for developing your own bot.

Every bot is built upon this structure:

```python
class MyBotHandler(object):
    '''
    A docstring documenting this bot.
    '''

    def usage(self):
        return '''Your description of the bot'''

    def handle_message(self, message, bot_handler):
        # add your code here

handler_class = MyBotHandler
```

* The class name (in this case *MyBotHandler*) can be defined by you
  and should match the name of your bot. To register your bot's class,
  adjust the last line `handler_class = MyBotHandler` to match your
  class name.

* Every bot needs to implement the functions
    * `usage(self)`
    * `handle_message(self, message, bot_handler)`

* These functions are documented in the [next section](#bot-api).

## Adding a bot to Zulip

Zulip's bot system resides in the [python-zulip-api](
https://github.com/zulip/python-zulip-api) repository.

The structure of the bots ecosystem looks like the following:

```
zulip_bots
└───zulip_bots
    ├───bots
    │   ├───bot1
    │   └───bot2
    │       │
    │       ├───bot2.py
    │       ├───bot2.conf
    │       ├───doc.md
    │       ├───requirements.txt
    │       ├───test_bot2.py
    │       ├───assets
    │       │   │
    │       │   └───pic.png
    │       ├───fixtures
    │       │   │
    │       │   └───test1.json
    │       └───libraries
    │           │
    │           └───lib1.py
    ├─── lib.py
    ├─── test_lib.py
    ├─── run.py
    └─── provision.py
```

Each subdirectory in `bots` contains a bot. When writing bots, try to use the structure outlined
above as an orientation.

## Testing a bot's output

If you just want to see how a bot reacts to a message, but don't want to set it up on a server,
we have a little tool to help you out: `zulip-bot-shell`

* [Install all requirements](#installing-a-development-version-of-the-zulip-bots-package).

* Run `zulip-bot-shell` to test one of the bots in
  [`zulip_bots/bots`](https://github.com/zulip/python-zulip-api/tree/main/zulip_bots/zulip_bots/bots).

Example invocations are below:

```
> zulip-bot-shell converter

Enter your message: "12 meter yard"
Response: 12.0 meter = 13.12336 yard

> zulip-bot-shell -b ~/followup.conf followup

Enter your message: "Task completed"
Response: stream: followup topic: foo_sender@zulip.com
          from foo_sender@zulip.com: Task completed

```

Note that the `-b` (aka `--bot-config-file`) argument is for an optional third party
config file (e.g., ~/giphy.conf), which only applies to certain types of bots.

## Bot API

This section documents functions available to the bot and the structure of the bot's config file.

With this API, you *can*

* intercept, view, and process messages sent by users on Zulip.
* send out new messages as replies to the processed messages.

With this API, you *cannot*

* modify an intercepted message (you have to send a new message).
* send messages on behalf of or impersonate other users.
* intercept direct messages (except for direct messages with the bot as an
explicit recipient).

### usage

*usage(self)*

is called to retrieve information about the bot.

#### Arguments

* self - the instance the method is called on.

#### Return values

* A string describing the bot's functionality

#### Example implementation

```python
def usage(self):
    return '''
        This plugin will allow users to flag messages
        as being follow-up items.  Users should preface
        messages with "@followup".
        Before running this, make sure to create a channel
        called "followup" that your API user can send to.
        '''
```

### handle_message

*handle_message(self, message, bot_handler)*

handles user message.

#### Arguments

* self - the instance the method is called on.

* message - a dictionary describing a Zulip message

* bot_handler - used to interact with the server, e.g., to send a message

#### Return values

None.

#### Example implementation

```python
  def handle_message(self, message, bot_handler):
     original_content = message['content']
     original_sender = message['sender_email']
     new_content = original_content.replace('@followup',
                                            'from %s:' % (original_sender,))

     bot_handler.send_message(dict(
         type='stream',
         to='followup',
         subject=message['sender_email'],
         content=new_content,
     ))
```
### bot_handler.send_message

*bot_handler.send_message(message)*

will send a message as the bot user.  Generally, this is less
convenient than *send_reply*, but it offers additional flexibility
about where the message is sent to.

#### Arguments

* message - a dictionary describing the message to be sent by the bot

#### Example implementation

```python
bot_handler.send_message(dict(
    type='stream', # can be 'stream' or 'private'
    to=channel_name, # either the channel name or user's email
    subject=subject, # message subject
    content=message, # content of the sent message
))
```

### bot_handler.send_reply

*bot_handler.send_reply(message, response)*

will reply to the triggering message to the same place the original
message was sent to, with the content of the reply being *response*.

#### Arguments

* message - Dictionary containing information on message to respond to
 (provided by `handle_message`).
* response - Response message from the bot (string).

### bot_handler.update_message

*bot_handler.update_message(message)*

will edit the content of a previously sent message.

#### Arguments

* message - dictionary defining what message to edit and the new content

#### Example

From `zulip_bots/bots/incrementor/incrementor.py`:

```python
bot_handler.update_message(dict(
    message_id=self.message_id, # id of message to be updated
    content=str(self.number), # string with which to update message with
))
```

### bot_handler.storage

A common problem when writing an interactive bot is that you want to
be able to store a bit of persistent state for the bot (e.g., for an
RSVP bot, the RSVPs).  For a sufficiently complex bot, you want need
your own database, but for simpler bots, we offer a convenient way for
bot code to persistently store data.

The interface for doing this is `bot_handler.storage`.

The data is stored in the Zulip Server's database. Each bot user has
an independent storage quota available to it.

#### Performance considerations

You can use `bot_handler.storage` in one of two ways:

- **Direct access**: You can use bot_handler.storage directly, which
will result in a round-trip to the server for each `get`, `put`, and
`contains` call.
- **Context manager**: Alternatively, you can use the `use_storage`
context manager to minimize the number of round-trips to the server. We
recommend writing bots with the context manager such that they
automatically fetch data at the start of `handle_message` and submit the
state to the server at the end.

#### Context manager use_storage

`use_storage(storage: BotStorage, keys: List[str])`

The context manager fetches the data for the specified keys and stores
them in a `CachedStorage` object with a `bot_handler.storage.get` call for
each key, at the start. This object will not communicate with the server
until manually calling flush or getting some values that are not previously
fetched. After the context manager block is exited, it will automatically
flush any changes made to the `CachedStorage` object to the server.

##### Arguments
* storage - a BotStorage object, i.e., `bot_handler.storage`
* keys - a list of keys to fetch

##### Example

```python
with use_storage(bot_handler.storage, ["foo", "bar"]) as cache:
    print(cache.get("foo"))  # print the value of "foo"
    cache.put("foo", "new value")  # update the value of "foo"
# changes are automatically flushed to the server on exiting the block
```

#### bot_handler.storage methods

When using the `use_storage` context manager, the `bot_handler.storage`
methods on the yielded object will only operate on a cached version of the
storage.

#### bot_handler.storage.put

*bot_handler.storage.put(key, value)*

will store the value `value` in the entry `key`.

##### Arguments

* key - a UTF-8 string
* value - a UTF-8 string

##### Example

```python
bot_handler.storage.put("foo", "bar")  # set entry "foo" to "bar"
```

#### bot_handler.storage.get

*bot_handler.storage.get(key)*

will retrieve the value for the entry `key`.

###### Arguments

* key - a UTF-8 string

##### Example

```python
bot_handler.storage.put("foo", "bar")
print(bot_handler.storage.get("foo"))  # print "bar"
```

#### bot_handler.storage.contains

*bot_handler.storage.contains(key)*

will check if the entry `key` exists.

Note that this will only check the cache, so it would return `False` if no
previous call to `bot_handler.storage.get()` or `bot_handler.storage.put()`
was made for `key`, since the bot was restarted.

##### Arguments

* key - a UTF-8 string

##### Example

```python
bot_handler.storage.contains("foo")  # False
bot_handler.storage.put("foo", "bar")
bot_handler.storage.contains("foo")  # True
```

#### bot_handler.storage marshaling

By default, `bot_handler.storage` accepts any object for keys and
values, as long as it is JSON-able. Internally, the object then gets
converted to an UTF-8 string. You can specify custom data marshaling
by setting the functions `bot_handler.storage.marshal` and
`bot_handler.storage.demarshal`. These functions parse your data on
every call to `put` and `get`, respectively.

#### Flushing cached data to the server

When using the `use_storage` context manager, you can manually flush
changes made to the cache to the server, using the below methods.

#### cache.flush

`cache.flush()`

will flush all changes to the cache to the server.

##### Example
```python
with use_storage(bot_handler.storage, ["foo", "bar"]) as cache:
    cache.put("foo", "foo_value")  # update the value of "foo"
    cache.put("bar", "bar_value")  # update the value of "bar"
    cache.flush()  # manually flush both the changes to the server
```

#### cache.flush_one

`cache.flush_one(key)`

will flush the changes for the specified key to the server.

##### Arguments

- key - a UTF-8 string

##### Example
```python
with use_storage(bot_handler.storage, ["foo", "bar"]) as cache:
    cache.put("foo", "baz")  # update the value of "foo"
    cache.put("bar", "bar_value")  # update the value of "bar"
    cache.flush_one("foo")  # flush the changes to "foo" to the server
```

### Configuration file

```
 [api]
 key=<api-key>
 email=<email>
 site=<dev-url>
```

* key - the API key you created for the bot; this is how Zulip knows
  the request is from an authorized user.

* email - the email address of the bot, e.g., `some-bot@zulip.com`

* site - your development environment URL; if you are working on a
  development environment hosted on your computer, use
  `localhost:9991`

## Writing tests for bots

Bots, like most software that you want to work, should have unit tests. In this section,
we detail our framework for writing unit tests for bots. We require that bots in the main
[`python-zulip-api`](https://github.com/zulip/python-zulip-api/tree/main/zulip_bots/zulip_bots/bots)
repository include a reasonable set of unit tests, so that future developers can easily
refactor them.

*Unit tests for bots make heavy use of mocking. If you want to get comfortable with mocking,
 mocking strategies, etc. you should check out our [mocking guide](
 https://zulip.readthedocs.io/en/latest/testing/testing-with-django.html#testing-with-mocks).*

### A simple example

 Let's have a look at a simple test suite for the [`helloworld`](
 https://github.com/zulip/python-zulip-api/tree/main/zulip_bots/zulip_bots/bots/helloworld)
 bot.

```python
from zulip_bots.test_lib import StubBotTestCase

class TestHelpBot(StubBotTestCase):
    bot_name: str = "helloworld"

    def test_bot(self) -> None:
        dialog = [
            ('', 'beep boop'),
            ('help', 'beep boop'),
            ('foo', 'beep boop'),
        ]

        self.verify_dialog(dialog)

```

The `helloworld` bot replies with "beep boop" to every message @-mentioning it.  We
want our test to verify that the bot **actually** does that.

Note that our helper method `verify_dialog` simulates the conversation for us, and
we just need to set up a list of tuples with expected results.

The best way to learn about bot tests is to read all the existing tests in the
`bots` subdirectories.

### Testing your test

Once you have written a test suite, you want to verify that everything works as expected.

* To test a bot in [Zulip's bot directory](
  https://github.com/zulip/python-zulip-api/tree/main/zulip_bots/zulip_bots/bots):
  `tools/test-bots <botname>`

* To run all bot tests: `tools/test-bots`

### Advanced testing

This section shows advanced testing techniques for more complicated bots that have
configuration files or interact with third-party APIs.
*The code for the bot testing library can be found [here](
 https://github.com/zulip/python-zulip-api/blob/main/zulip_bots/zulip_bots/test_lib.py).*


#### Testing bots with config files

Some bots, such as [Giphy](
https://github.com/zulip/python-zulip-api/tree/main/zulip_bots/zulip_bots/bots/giphy),
support or require user configuration options to control how the bot works.

To test such a bot, you can use the following pattern:

    with self.mock_config_info(dict(api_key=12345)):
        # self.verify_reply(...)

`mock_config_info()` replaces the actual step of reading configuration from the file
system and gives your test "dummy data" instead.

#### Testing bots with internet access

Some bots, such as [Giphy](
https://github.com/zulip/python-zulip-api/tree/main/zulip_bots/zulip_bots/bots/giphy),
depend on a third-party service, such as the Giphy web app, in order to work. Because
we want our test suite to be reliable and not add load to these third-party APIs, tests
for these services need to have "test fixtures": sample HTTP request/response pairs to
be used by the tests. You can specify which one to use in your test code using the
following helper method:

    with self.mock_http_conversation('test_fixture_name'):
        # self.assert_bot_response(...)

`mock_http_conversation(fixture_name)` patches `requests.get` and returns the data specified
in the file `fixtures/{fixture_name}.json`. Use the following JSON code as a skeleton for new
fixtures:
```json
{
  "request": {
    "api_url": "http://api.example.com/",
    "params": {
    }
  },
  "response": {
  },
  "response-headers": {
  }
}
```
For an example, check out the [giphy bot](
https://github.com/zulip/python-zulip-api/tree/main/zulip_bots/zulip_bots/bots/giphy).

*Tip: You can use [requestbin](https://requestbin.com/) or a similar
tool to capture payloads from the service your bot is interacting
with.*

#### Examples

Check out our [bots](https://github.com/zulip/python-zulip-api/tree/main/zulip_bots/zulip_bots/bots)
to see examples of bot tests.

## Common problems

* I modified my bot's code, yet the changes don't seem to have an effect.
    * Ensure that you restarted the `zulip-run-bot` script.

* My bot won't start
    * Ensure that your API config file is correct (download the config file from the server).
    * Ensure that you bot script is located in `zulip_bots/bots/<my-bot>/`
    * Are you using your own Zulip development server? Ensure that you run your bot outside
      the Vagrant environment.
    * Some bots require Python 3. Try switching to a Python 3 environment before running
      your bot.

## Future direction

The long-term plan for this bot system is to allow the same
`ExternalBotHandler` code to eventually be usable in several contexts:

* Run directly using the Zulip `call_on_each_message` API, which is
  how the implementation above works.  This is great for quick
  development with minimal setup.
* Run in a simple Python web server, processing messages
  received from Zulip's outgoing webhooks integration.
* For bots merged into the mainline Zulip codebase, enabled via a
  button in the Zulip web UI, with no code deployment effort required.

## Related articles

* [Non-webhook integrations](/api/non-webhook-integrations)
* [Running bots](/api/running-bots)
* [Deploying bots](/api/deploying-bots)
* [Configuring the Python bindings](/api/configuring-python-bindings)
