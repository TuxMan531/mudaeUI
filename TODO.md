# TODO
## You can cross these TODOs out, once they are done

- [x] when on the collection tab $mm auto fills charecters from page one, perfect, but it should see how many pages there are and flick through them like one after the other to get a good view of the users entiere collection

- [x] $dk should probobly be in the timers section now the kakera tab

- [x] $k on the kakara tab doesn't load any of the shop info on our UI

- [x] The timer tab doens't work proprolly after doing $tu

- [x] on the rolls tab the claims doesn't reaload or fefrsh correctly

- [x] when we do $tu on the timers tab, we should hold universial veraibles to remmeber that information so that if a userr flips between the rolls tab and the timers tab they're not having to do $tu twice, we just did it so we should remember. We should not remember these varibles if the app closes though

- [x] remember to add the reload button to  anywhere where charecter cards are shown

- [x] error handling: resend a Mudae command if it gets no reply within 5s (the Slate paste sometimes no-ops); dedupe the occasional double reply by message id. Claim excluded (a retry could claim a different roll).

#hr

- $ku should be a button on the rolls screen because you can only react to kakara when you're rolling a charecter and someone allready claimed the charecter you rolled, we will also have to add tracking to see if someone allready owns the charecter that we rolled and what color / tpye of kakra reaction it is, sometimes the kakra emoji on the message that you have to react to is a diffrent color and it corrolates to how much kakra is gives you, so this implimentation will be large but as apart of it I want to add a "Server Collection" tab where you're able to type soemone's username on the UI and then it will run the $mm @username mudade command, for example `$mm @JerryCann` and then that will tell us how many pages of $mm there is then we can do `$mm @JerryCann 2` for page 2. In practice we can get a user's account ID in the case of @jerrycann it's 209705406442766336, so we would send `$mm <@209705406442766336> 2` anmd use <@UserID> Instead. For the UI we can have a dropdown menu of all the users in the server, the server being the one that the client is in, we can add discord navigation more in settings at a later date 

- add UI support in the kakara tab under shop for $kt (which is kakera tower)

- [x] collection tab should have a number above the user's collection saying how many charecter's they have, total karaka worth of all charecters and avrg rank of top 15, we can call that "top 15 value"

- [x] some of the text on the button around the app are cutoff with a "..."

- [x] roll history should presist between app realods

- [x] charecter images should presist between app reloads, we should save them locally for quick loading.

#hr

- [x] on the rolls tab, the Claims status should keep counting down to the next claim reset even when you can claim right now (instead of just showing "ready")

- [x] add the $profile command somewhere in the collection tab

- [x] slow-loading roll art (image takes >2.5s in Discord) was being missed: now the roll card shows immediately and its art is patched in when it finishes loading
