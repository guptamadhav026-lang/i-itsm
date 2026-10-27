package com.itsm.repository;

import com.itsm.model.Notification;
import com.itsm.model.NotificationChannelType;
import com.itsm.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientOrderByCreatedAtDescIdDesc(User recipient);

    long countByRecipientAndChannelAndReadFlagFalse(User recipient, NotificationChannelType channel);
}
