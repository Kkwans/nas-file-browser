package events

import (
	"testing"
	"time"
)

func TestBrokerReplaysAndReportsGap(t *testing.T) {
	broker := New(2)
	broker.Publish("task.changed", map[string]string{"id": "one"})
	broker.Publish("task.changed", map[string]string{"id": "two"})
	broker.Publish("task.changed", map[string]string{"id": "three"})
	replay, channel, cancel, gap := broker.Subscribe(1)
	defer cancel()
	if gap || len(replay) != 2 || replay[0].ID != 2 || replay[1].ID != 3 {
		t.Fatalf("replay=%#v gap=%v", replay, gap)
	}
	broker.Publish("history.created", map[string]string{"id": "four"})
	select {
	case event := <-channel:
		if event.Type != "history.created" {
			t.Fatalf("event type = %q", event.Type)
		}
	default:
		t.Fatal("subscriber did not receive event")
	}
}

func TestBrokerKeepsUserEventsPrivate(t *testing.T) {
	broker := New(8)
	_, userOne, cancelOne, _ := broker.SubscribeForUser(0, 11)
	defer cancelOne()
	_, userTwo, cancelTwo, _ := broker.SubscribeForUser(0, 22)
	defer cancelTwo()

	broker.PublishForUser(11, "task.changed", map[string]string{"id": "one"})
	select {
	case event := <-userOne:
		if event.Audience != 11 {
			t.Fatalf("audience = %d, want 11", event.Audience)
		}
	case <-time.After(time.Second):
		t.Fatal("user one did not receive its event")
	}
	select {
	case event := <-userTwo:
		t.Fatalf("user two received private event: %#v", event)
	case <-time.After(20 * time.Millisecond):
	}

	// Replay applies the same audience filter as live delivery.
	replay, _, cancelReplay, _ := broker.SubscribeForUser(0, 22)
	defer cancelReplay()
	if len(replay) != 0 {
		t.Fatalf("private replay leaked: %#v", replay)
	}
}
