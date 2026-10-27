package com.itsm.live;

import com.itsm.model.Role;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Predicate;

/**
 * Keeps one open connection (Server-Sent Events) per logged-in browser tab and pushes
 * live updates through it, so screens refresh by themselves without the user clicking reload.
 */
@Component
public class LiveUpdateHub {

    private static final Logger log = LoggerFactory.getLogger(LiveUpdateHub.class);
    private static final long NO_TIMEOUT = 0L;

    /** Who is listening on one connection. Only the username and role are kept (no database access). */
    public record Subscriber(String username, Role role, SseEmitter emitter) {
    }

    // CopyOnWriteArrayList: safe when one thread sends while another thread adds or removes a connection.
    private final List<Subscriber> subscribers = new CopyOnWriteArrayList<>();
    private final Set<String> blocked = ConcurrentHashMap.newKeySet();
    private volatile boolean closing;

    public SseEmitter subscribe(String username, Role role) {
        SseEmitter emitter = new SseEmitter(NO_TIMEOUT);
        if (closing) {
            emitter.complete();
            return emitter;
        }
        Subscriber subscriber = new Subscriber(username, role, emitter);
        subscribers.add(subscriber);
        emitter.onCompletion(() -> subscribers.remove(subscriber));
        emitter.onTimeout(() -> subscribers.remove(subscriber));
        emitter.onError(e -> subscribers.remove(subscriber));
        send(subscriber, "connected", "ok");
        return emitter;
    }

    /** Sends the update to every subscriber the filter accepts (e.g. "may see this incident"). */
    public void broadcast(LiveUpdate update, Predicate<Subscriber> mayReceive) {
        for (Subscriber subscriber : subscribers) {
            if (mayReceive.test(subscriber)) {
                send(subscriber, "incident", update);
            }
        }
    }

    /** A comment line every 25 s keeps proxies from closing idle connections and removes dead ones. */
    @Scheduled(fixedRate = 25_000)
    public void heartbeat() {
        for (Subscriber subscriber : subscribers) {
            try {
                subscriber.emitter().send(SseEmitter.event().comment("ping"));
            } catch (IOException | IllegalStateException ex) {
                subscribers.remove(subscriber);
            }
        }
    }

    /**
     * A deactivated account: its open connections are closed and its still-valid token cannot open new ones.
     * Kept in memory so the check needs no database access (an open stream must not hold a database connection).
     */
    public void block(String username) {
        blocked.add(username);
        for (Subscriber subscriber : subscribers) {
            if (subscriber.username().equals(username)) {
                subscribers.remove(subscriber);
                subscriber.emitter().complete();
            }
        }
    }

    public void unblock(String username) {
        blocked.remove(username);
    }

    public boolean isBlocked(String username) {
        return blocked.contains(username);
    }

    /**
     * The server is stopping (Ctrl+C): the open streams are ended first. Otherwise the graceful shutdown waits
     * 30 seconds for these never-ending requests before it gives up. The browsers reconnect once the server is back.
     */
    @EventListener(ContextClosedEvent.class)
    public void closeAll() {
        closing = true;
        for (Subscriber subscriber : subscribers) {
            subscribers.remove(subscriber);
            subscriber.emitter().complete();
        }
    }

    public int connectionCount() {
        return subscribers.size();
    }

    private void send(Subscriber subscriber, String eventName, Object data) {
        try {
            subscriber.emitter().send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException | IllegalStateException ex) {
            log.debug("Dropping closed live connection of {}", subscriber.username());
            subscribers.remove(subscriber);
        }
    }
}
